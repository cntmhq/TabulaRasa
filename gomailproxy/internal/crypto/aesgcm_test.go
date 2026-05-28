package crypto

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"testing"
)

func newTestKey(t *testing.T) []byte {
	t.Helper()
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return raw
}

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := newTestKey(t)
	plaintext := []byte(`{"access_token":"abc","refresh_token":"def"}`)

	blob, err := EncryptAESGCM(plaintext, key)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	got, err := DecryptAESGCM(blob, key)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Fatalf("plaintext mismatch: got %q want %q", got, plaintext)
	}
}

func TestNonceIsRandomizedPerWrite(t *testing.T) {
	key := newTestKey(t)
	plaintext := []byte("identical payload")

	a, err := EncryptAESGCM(plaintext, key)
	if err != nil {
		t.Fatalf("encrypt a: %v", err)
	}
	b, err := EncryptAESGCM(plaintext, key)
	if err != nil {
		t.Fatalf("encrypt b: %v", err)
	}
	if bytes.Equal(a, b) {
		t.Fatal("two encryptions of the same plaintext produced identical ciphertext — nonce was reused")
	}
}

func TestDecryptRejectsTamperedCiphertext(t *testing.T) {
	key := newTestKey(t)
	blob, err := EncryptAESGCM([]byte("payload"), key)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	blob[len(blob)-1] ^= 0xFF
	if _, err := DecryptAESGCM(blob, key); err == nil {
		t.Fatal("expected GCM auth tag failure on tampered ciphertext")
	}
}

func TestDecodeKey(t *testing.T) {
	raw := newTestKey(t)
	key, err := DecodeKey(hex.EncodeToString(raw))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !bytes.Equal(key, raw) {
		t.Fatal("decoded key does not match original")
	}
	if _, err := DecodeKey("short"); err == nil {
		t.Fatal("expected error for short hex key")
	}
}
