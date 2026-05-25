package api

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
)

const readinessProbeTimeout = 2 * time.Second

// registerHealth wires Kubernetes-style probe endpoints.
//
//   - /livez  always returns 200 once the process can serve HTTP. A failure
//     here is the kubelet's signal to restart the pod.
//   - /readyz checks dependencies the service must reach to do useful work
//     (currently: the SQLite DB). 503 here removes the pod from the Service
//     endpoints without restarting it.
//   - /healthz is kept as an alias for /readyz so the existing Docker
//     HEALTHCHECK and any prior callers keep working.
func (s *Server) registerHealth(e *echo.Echo) {
	e.GET("/livez", s.handleLive)
	e.GET("/readyz", s.handleReady)
	e.GET("/healthz", s.handleReady)
}

func (s *Server) handleLive(c echo.Context) error {
	return c.JSON(http.StatusOK, echo.Map{"status": "ok"})
}

func (s *Server) handleReady(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), readinessProbeTimeout)
	defer cancel()

	if err := s.pingDB(ctx); err != nil {
		return c.JSON(http.StatusServiceUnavailable, echo.Map{
			"status": "unavailable",
			"checks": echo.Map{"database": err.Error()},
		})
	}
	return c.JSON(http.StatusOK, echo.Map{
		"status": "ok",
		"checks": echo.Map{"database": "ok"},
	})
}

func (s *Server) pingDB(ctx context.Context) error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}
