package oauth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/tabularasa/gomailproxy/internal/config"
	"github.com/tabularasa/gomailproxy/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	gmailapi "google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

// GmailSendScope is the only scope we request from Google. The opt-out send
// path needs to insert messages into the user's Sent folder; nothing else.
const GmailSendScope = gmailapi.GmailSendScope

// Manager owns the in-flight OAuth state map plus the oauth2.Config shared by
// all token sources.
type Manager struct {
	cfg     *oauth2.Config
	appURL  string
	mu      sync.Mutex
	pending map[string]pendingState
}

type pendingState struct {
	UserEmail string
	CreatedAt time.Time
}

func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		cfg: &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURI,
			Scopes:       []string{GmailSendScope},
			Endpoint:     google.Endpoint,
		},
		appURL:  cfg.AppURL,
		pending: make(map[string]pendingState),
	}
}

// AuthURI returns the consent URL plus the state nonce mapped to user_email.
// Google's "offline" + "consent" combination forces a refresh_token even on
// re-authorization.
func (m *Manager) AuthURI(userEmail string) (string, string) {
	state := randomState()
	m.mu.Lock()
	m.pending[state] = pendingState{UserEmail: userEmail, CreatedAt: time.Now()}
	m.mu.Unlock()
	uri := m.cfg.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce,
		oauth2.SetAuthURLParam("login_hint", userEmail),
		oauth2.SetAuthURLParam("include_granted_scopes", "true"),
	)
	return uri, state
}

// ConsumeState swaps the nonce returned by Google back into the user_email it
// was issued for. State is single-use.
func (m *Manager) ConsumeState(state string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.pending[state]
	if !ok {
		return "", errors.New("unknown or expired oauth state")
	}
	delete(m.pending, state)
	if time.Since(entry.CreatedAt) > 10*time.Minute {
		return "", errors.New("oauth state expired")
	}
	return entry.UserEmail, nil
}

// Exchange swaps the authorization code for an access+refresh token pair.
func (m *Manager) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	tok, err := m.cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("oauth exchange: %w", err)
	}
	if tok.RefreshToken == "" {
		return nil, errors.New("google returned no refresh_token; ask the user to remove the app from their Google account and reconnect")
	}
	return tok, nil
}

// GmailService builds an auto-refreshing Gmail client around the stored token.
// Whenever oauth2.TokenSource swaps in a fresher access token the caller can
// observe it via the returned RefreshedToken function and re-seal it on disk.
func (m *Manager) GmailService(ctx context.Context, stored *models.SecretOAuthToken) (*gmailapi.Service, func() *oauth2.Token, error) {
	if stored == nil {
		return nil, nil, errors.New("nil stored token")
	}
	base := &oauth2.Token{
		AccessToken:  stored.AccessToken,
		RefreshToken: stored.RefreshToken,
		TokenType:    stored.TokenType,
		Expiry:       stored.Expiry,
	}
	tracker := &trackedSource{src: m.cfg.TokenSource(ctx, base)}
	httpClient := oauth2.NewClient(ctx, tracker)
	svc, err := gmailapi.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, nil, fmt.Errorf("gmail client: %w", err)
	}
	return svc, tracker.Latest, nil
}

// AppURL surfaces the configured redirect target for the post-consent landing.
func (m *Manager) AppURL() string {
	return m.appURL
}

// AppendStatus returns the AppURL decorated with a success/failure query so
// the SPA can render an in-app banner.
func (m *Manager) AppendStatus(status, detail string) string {
	sep := "?"
	if strings.Contains(m.appURL, "?") {
		sep = "&"
	}
	encoded := strings.NewReplacer(" ", "+", "&", "%26").Replace(detail)
	if encoded == "" {
		return fmt.Sprintf("%s%sgmail=%s", m.appURL, sep, status)
	}
	return fmt.Sprintf("%s%sgmail=%s&detail=%s", m.appURL, sep, status, encoded)
}

type trackedSource struct {
	src     oauth2.TokenSource
	mu      sync.Mutex
	current *oauth2.Token
}

func (t *trackedSource) Token() (*oauth2.Token, error) {
	tok, err := t.src.Token()
	if err != nil {
		return nil, err
	}
	t.mu.Lock()
	t.current = tok
	t.mu.Unlock()
	return tok, nil
}

func (t *trackedSource) Latest() *oauth2.Token {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.current
}

func randomState() string {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		// Falling back to a deterministic value here would defeat the
		// purpose of state; panic so the operator notices a misconfigured
		// CSPRNG immediately.
		panic(fmt.Sprintf("crypto/rand failed: %v", err))
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}
