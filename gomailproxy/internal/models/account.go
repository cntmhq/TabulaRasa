package models

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/tabularasa/gomailproxy/internal/crypto"
	"gorm.io/gorm"
)

const (
	StatusPendingAuth = "pending_auth"
	StatusActive      = "active"
	StatusSuspended   = "suspended"
)

// MailAccount is the on-disk record. EncryptedData holds an AES-256-GCM
// envelope wrapping a serialized SecretOAuthToken; raw access/refresh tokens
// never touch the database in plaintext.
type MailAccount struct {
	ID            string `gorm:"primaryKey"`
	UserEmail     string `gorm:"type:varchar(255);uniqueIndex;not null"`
	Status        string `gorm:"type:varchar(50);not null;default:'pending_auth'"`
	EncryptedData []byte `gorm:"type:blob"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
}

// SecretOAuthToken is the in-memory plaintext shape held only inside the
// service layer. It is sealed before it crosses the storage boundary.
type SecretOAuthToken struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	Expiry       time.Time `json:"expiry"`
	Scopes       []string  `json:"scopes"`
}

func (a *MailAccount) SetSecret(secret *SecretOAuthToken, key []byte) error {
	if secret == nil {
		return errors.New("secret token is nil")
	}
	raw, err := json.Marshal(secret)
	if err != nil {
		return err
	}
	blob, err := crypto.EncryptAESGCM(raw, key)
	if err != nil {
		return err
	}
	a.EncryptedData = blob
	return nil
}

func (a *MailAccount) Secret(key []byte) (*SecretOAuthToken, error) {
	if len(a.EncryptedData) == 0 {
		return nil, errors.New("account has no stored credentials")
	}
	raw, err := crypto.DecryptAESGCM(a.EncryptedData, key)
	if err != nil {
		return nil, err
	}
	var secret SecretOAuthToken
	if err := json.Unmarshal(raw, &secret); err != nil {
		return nil, err
	}
	return &secret, nil
}
