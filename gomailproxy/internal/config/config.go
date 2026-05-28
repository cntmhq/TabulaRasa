package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	EncryptionKeyHex   string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
	AppURL             string
	AllowedOrigins     []string
	DatabasePath       string
	ListenAddr         string
	MaxAccounts        int
}

func Load() (*Config, error) {
	cfg := &Config{
		EncryptionKeyHex:   os.Getenv("GOMAPROXY_ENCRYPTION_KEY"),
		GoogleClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
		GoogleRedirectURI:  envOr("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8080/api/v1/oauth/callback"),
		AppURL:             envOr("APP_URL", "http://localhost:3000"),
		DatabasePath:       envOr("DATABASE_PATH", "./gomailproxy.db"),
		ListenAddr:         envOr("LISTEN_ADDR", ":8080"),
	}

	cfg.AllowedOrigins = splitCSV(envOr("CORS_ALLOWED_ORIGINS", cfg.AppURL))

	max, err := strconv.Atoi(envOr("MAX_ACCOUNTS", "50"))
	if err != nil || max <= 0 {
		return nil, fmt.Errorf("MAX_ACCOUNTS must be a positive integer: %w", err)
	}
	cfg.MaxAccounts = max

	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) Validate() error {
	if len(c.EncryptionKeyHex) != 64 {
		return errors.New("GOMAPROXY_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)")
	}
	if c.GoogleClientID == "" || c.GoogleClientSecret == "" {
		return errors.New("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required")
	}
	if c.GoogleRedirectURI == "" {
		return errors.New("GOOGLE_OAUTH_REDIRECT_URI is required")
	}
	return nil
}

func envOr(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
