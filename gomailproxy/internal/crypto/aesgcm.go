package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

// DecodeKey converts the 32-byte hex root key supplied via env into a raw key.
func DecodeKey(hexKey string) ([]byte, error) {
	if len(hexKey) != 64 {
		return nil, errors.New("encryption key must be 64 hex characters (32 bytes)")
	}
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("decode encryption key: %w", err)
	}
	if len(key) != 32 {
		return nil, errors.New("decoded encryption key is not 32 bytes")
	}
	return key, nil
}

// EncryptAESGCM seals plaintext with AES-256-GCM. The 12-byte nonce is freshly
// randomized for every call and prepended to the returned ciphertext.
func EncryptAESGCM(plaintext, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm: %w", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("nonce: %w", err)
	}
	sealed := gcm.Seal(nil, nonce, plaintext, nil)
	out := make([]byte, 0, len(nonce)+len(sealed))
	out = append(out, nonce...)
	out = append(out, sealed...)
	return out, nil
}

// DecryptAESGCM reverses EncryptAESGCM. Inputs shorter than the nonce header
// are rejected outright to avoid panicking the runtime.
func DecryptAESGCM(blob, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("aes cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm: %w", err)
	}
	if len(blob) < gcm.NonceSize() {
		return nil, errors.New("ciphertext is shorter than the nonce header")
	}
	nonce := blob[:gcm.NonceSize()]
	ciphertext := blob[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
