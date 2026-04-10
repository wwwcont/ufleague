package session

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"
)

type Manager struct {
	cookieName string
	ttl        time.Duration
	secure     bool
	domain     string
}

func NewManager(cookieName string, ttl time.Duration, secure bool, domain string) Manager {
	return Manager{cookieName: cookieName, ttl: ttl, secure: secure, domain: domain}
}

func (m Manager) CookieName() string { return m.cookieName }
func (m Manager) TTL() time.Duration { return m.ttl }
func (m Manager) Secure() bool       { return m.secure }
func (m Manager) Domain() string     { return m.domain }

func (Manager) GenerateToken() (rawToken string, tokenHash []byte, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", nil, err
	}

	rawToken = base64.RawURLEncoding.EncodeToString(buf)
	hash := sha256.Sum256([]byte(rawToken))
	return rawToken, hash[:], nil
}

func (Manager) HashToken(raw string) []byte {
	hash := sha256.Sum256([]byte(raw))
	return hash[:]
}
