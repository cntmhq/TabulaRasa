package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func newTestServer(t *testing.T) (*Server, *gorm.DB) {
	t.Helper()
	gdb, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}
	return &Server{db: gdb}, gdb
}

func TestLivez_AlwaysOK(t *testing.T) {
	s, _ := newTestServer(t)
	e := echo.New()
	s.registerHealth(e)

	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/livez", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("livez: got %d, want 200", rec.Code)
	}
}

func TestReadyz_OKWhenDBReachable(t *testing.T) {
	s, _ := newTestServer(t)
	e := echo.New()
	s.registerHealth(e)

	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("readyz: got %d, want 200; body=%s", rec.Code, rec.Body.String())
	}
}

func TestReadyz_503WhenDBClosed(t *testing.T) {
	s, gdb := newTestServer(t)
	sqlDB, err := gdb.DB()
	if err != nil {
		t.Fatalf("get sql.DB: %v", err)
	}
	// Close the underlying connection pool to force PingContext to fail.
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close sql.DB: %v", err)
	}

	e := echo.New()
	s.registerHealth(e)

	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("readyz with closed DB: got %d, want 503; body=%s", rec.Code, rec.Body.String())
	}
}
