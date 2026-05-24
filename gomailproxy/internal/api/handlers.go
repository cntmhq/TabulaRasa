package api

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/tabularasa/gomailproxy/internal/config"
	mailbuilder "github.com/tabularasa/gomailproxy/internal/mail"
	"github.com/tabularasa/gomailproxy/internal/models"
	"github.com/tabularasa/gomailproxy/internal/oauth"
	"gorm.io/gorm"
)

type Server struct {
	cfg     *config.Config
	db      *gorm.DB
	oauth   *oauth.Manager
	encKey  []byte
}

func NewServer(cfg *config.Config, db *gorm.DB, mgr *oauth.Manager, encKey []byte) *Server {
	return &Server{cfg: cfg, db: db, oauth: mgr, encKey: encKey}
}

func (s *Server) Register(e *echo.Echo) {
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     s.cfg.AllowedOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodDelete},
		AllowHeaders:     []string{echo.HeaderContentType, echo.HeaderAuthorization, "X-User-Email"},
		AllowCredentials: false,
	}))

	v1 := e.Group("/api/v1")
	v1.POST("/accounts/onboard", s.handleOnboard)
	v1.GET("/accounts/status", s.handleAccountStatus)
	v1.DELETE("/accounts", s.handleDeleteAccount)
	v1.GET("/oauth/callback", s.handleOAuthCallback)
	v1.POST("/email/send", s.handleSend)
	e.GET("/healthz", func(c echo.Context) error { return c.JSON(http.StatusOK, echo.Map{"status": "ok"}) })
}

// ---------- onboarding ----------

type onboardReq struct {
	UserEmail string `json:"user_email"`
}

type onboardResp struct {
	UserEmail string `json:"user_email"`
	AuthURI   string `json:"auth_uri"`
}

func (s *Server) handleOnboard(c echo.Context) error {
	var req onboardReq
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid JSON body")
	}
	req.UserEmail = strings.TrimSpace(strings.ToLower(req.UserEmail))
	if _, err := mail.ParseAddress(req.UserEmail); err != nil {
		return badRequest(c, "user_email must be a valid address")
	}

	if err := s.enforceUserCap(req.UserEmail); err != nil {
		return c.JSON(http.StatusForbidden, echo.Map{"error": err.Error()})
	}

	acct, err := s.upsertPending(req.UserEmail)
	if err != nil {
		return serverError(c, err)
	}
	uri, _ := s.oauth.AuthURI(acct.UserEmail)
	return c.JSON(http.StatusOK, onboardResp{UserEmail: acct.UserEmail, AuthURI: uri})
}

func (s *Server) upsertPending(email string) (*models.MailAccount, error) {
	var acct models.MailAccount
	err := s.db.Where("user_email = ?", email).First(&acct).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		acct = models.MailAccount{ID: uuid.NewString(), UserEmail: email, Status: models.StatusPendingAuth}
		if err := s.db.Create(&acct).Error; err != nil {
			return nil, err
		}
		return &acct, nil
	}
	if err != nil {
		return nil, err
	}
	if acct.Status == models.StatusSuspended {
		acct.Status = models.StatusPendingAuth
		if err := s.db.Save(&acct).Error; err != nil {
			return nil, err
		}
	}
	return &acct, nil
}

func (s *Server) enforceUserCap(email string) error {
	var existing models.MailAccount
	if err := s.db.Where("user_email = ?", email).First(&existing).Error; err == nil {
		return nil
	}
	var count int64
	if err := s.db.Model(&models.MailAccount{}).Count(&count).Error; err != nil {
		return err
	}
	if int(count) >= s.cfg.MaxAccounts {
		return errors.New("account cap reached for test phase; contact the operator")
	}
	return nil
}

// ---------- status / delete ----------

func (s *Server) handleAccountStatus(c echo.Context) error {
	email := strings.TrimSpace(strings.ToLower(c.QueryParam("user_email")))
	if _, err := mail.ParseAddress(email); err != nil {
		return badRequest(c, "user_email is required")
	}
	var acct models.MailAccount
	if err := s.db.Where("user_email = ?", email).First(&acct).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusOK, echo.Map{"user_email": email, "status": "unknown"})
		}
		return serverError(c, err)
	}
	return c.JSON(http.StatusOK, echo.Map{
		"user_email": acct.UserEmail,
		"status":     acct.Status,
		"updated_at": acct.UpdatedAt,
	})
}

func (s *Server) handleDeleteAccount(c echo.Context) error {
	email := strings.TrimSpace(strings.ToLower(c.QueryParam("user_email")))
	if _, err := mail.ParseAddress(email); err != nil {
		return badRequest(c, "user_email is required")
	}
	if err := s.db.Where("user_email = ?", email).Delete(&models.MailAccount{}).Error; err != nil {
		return serverError(c, err)
	}
	return c.JSON(http.StatusOK, echo.Map{"status": "deleted"})
}

// ---------- oauth callback ----------

func (s *Server) handleOAuthCallback(c echo.Context) error {
	if errParam := c.QueryParam("error"); errParam != "" {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("denied", errParam))
	}
	code := c.QueryParam("code")
	state := c.QueryParam("state")
	if code == "" || state == "" {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("error", "missing code or state"))
	}

	email, err := s.oauth.ConsumeState(state)
	if err != nil {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("error", err.Error()))
	}

	tok, err := s.oauth.Exchange(c.Request().Context(), code)
	if err != nil {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("error", err.Error()))
	}

	var acct models.MailAccount
	if err := s.db.Where("user_email = ?", email).First(&acct).Error; err != nil {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("error", "account record missing"))
	}
	secret := &models.SecretOAuthToken{
		AccessToken:  tok.AccessToken,
		RefreshToken: tok.RefreshToken,
		TokenType:    tok.TokenType,
		Expiry:       tok.Expiry,
		Scopes:       []string{oauth.GmailSendScope},
	}
	if err := acct.SetSecret(secret, s.encKey); err != nil {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("error", err.Error()))
	}
	acct.Status = models.StatusActive
	if err := s.db.Save(&acct).Error; err != nil {
		return c.Redirect(http.StatusFound, s.oauth.AppendStatus("error", err.Error()))
	}
	return c.Redirect(http.StatusFound, s.oauth.AppendStatus("connected", ""))
}

// ---------- send ----------

type sendReq struct {
	SenderIdentity   string `json:"sender_identity"`
	RecipientAddress string `json:"recipient_address"`
	SubjectLine      string `json:"subject_line"`
	BodyContentHTML  string `json:"body_content_html"`
	BodyContentPlain string `json:"body_content_plain"`
}

func (s *Server) handleSend(c echo.Context) error {
	var req sendReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, echo.Map{"error": "invalid JSON body"})
	}
	sender := strings.TrimSpace(strings.ToLower(req.SenderIdentity))
	if sender == "" {
		return c.JSON(http.StatusUnprocessableEntity, echo.Map{"error": "sender_identity is required"})
	}
	// Optional header-based sender pin: the SPA echoes the signed-in user so
	// a stolen body can't impersonate a different connected mailbox.
	if hdr := strings.TrimSpace(strings.ToLower(c.Request().Header.Get("X-User-Email"))); hdr != "" && hdr != sender {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "sender_identity does not match authenticated user"})
	}

	out := &mailbuilder.Outbound{
		Sender:           req.SenderIdentity,
		Recipient:        req.RecipientAddress,
		Subject:          req.SubjectLine,
		BodyPlain:        req.BodyContentPlain,
		BodyHTML:         req.BodyContentHTML,
	}
	if err := out.Validate(); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, echo.Map{"error": err.Error()})
	}

	var acct models.MailAccount
	if err := s.db.Where("user_email = ?", sender).First(&acct).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "no Gmail consent on file for this address"})
	}
	if acct.Status != models.StatusActive {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Gmail consent is not active"})
	}

	stored, err := acct.Secret(s.encKey)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "stored credentials unreadable"})
	}

	ctx := c.Request().Context()
	svc, latest, err := s.oauth.GmailService(ctx, stored)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": err.Error()})
	}

	raw, err := mailbuilder.BuildRFC822(out)
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, echo.Map{"error": err.Error()})
	}
	sent, err := mailbuilder.Send(svc, sender, raw)
	if err != nil {
		s.maybeSuspend(&acct, err)
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": err.Error()})
	}

	if refreshed := latest(); refreshed != nil && refreshed.AccessToken != stored.AccessToken {
		stored.AccessToken = refreshed.AccessToken
		stored.Expiry = refreshed.Expiry
		stored.TokenType = refreshed.TokenType
		if refreshed.RefreshToken != "" {
			stored.RefreshToken = refreshed.RefreshToken
		}
		_ = acct.SetSecret(stored, s.encKey)
		_ = s.db.Save(&acct).Error
	}

	return c.JSON(http.StatusAccepted, echo.Map{
		"status":        "success",
		"message_id":    sent.Id,
		"thread_id":     sent.ThreadId,
		"dispatched_at": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) maybeSuspend(acct *models.MailAccount, sendErr error) {
	if sendErr == nil {
		return
	}
	msg := sendErr.Error()
	if strings.Contains(msg, "invalid_grant") || strings.Contains(msg, "401") || strings.Contains(msg, "403") {
		acct.Status = models.StatusSuspended
		_ = s.db.Save(acct).Error
	}
}

// ---------- helpers ----------

func badRequest(c echo.Context, msg string) error {
	return c.JSON(http.StatusBadRequest, echo.Map{"error": msg})
}

func serverError(c echo.Context, err error) error {
	return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
}
