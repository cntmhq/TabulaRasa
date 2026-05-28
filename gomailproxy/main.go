package main

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/engram/gomailproxy/internal/api"
	"github.com/engram/gomailproxy/internal/config"
	"github.com/engram/gomailproxy/internal/crypto"
	"github.com/engram/gomailproxy/internal/db"
	"github.com/engram/gomailproxy/internal/oauth"
)

func main() {
	// .env is optional in containerized deploys; missing file is not fatal.
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	encKey, err := crypto.DecodeKey(cfg.EncryptionKeyHex)
	if err != nil {
		log.Fatalf("encryption key: %v", err)
	}

	gdb, err := db.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	mgr := oauth.NewManager(cfg)
	srv := api.NewServer(cfg, gdb, mgr, encKey)

	e := echo.New()
	e.HideBanner = true
	srv.Register(e)

	log.Printf("gomailproxy listening on %s (cap=%d, db=%s)", cfg.ListenAddr, cfg.MaxAccounts, cfg.DatabasePath)
	if err := e.Start(cfg.ListenAddr); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}
