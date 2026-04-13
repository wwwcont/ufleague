package domain

import "time"

type TelegramAuthStartResponse struct {
	RequestID string    `json:"request_id"`
	AuthURL   string    `json:"auth_url"`
	ExpiresAt time.Time `json:"expires_at"`
}

type TelegramAuthStartRequest struct {
	Role *Role `json:"role,omitempty"`
}

type TelegramCodeLoginRequest struct {
	RequestID string `json:"request_id"`
	Code      string `json:"code"`
}

type TelegramIssueCodeRequest struct {
	RequestID        string `json:"request_id"`
	TelegramUserID   int64  `json:"telegram_user_id"`
	TelegramUsername string `json:"telegram_username,omitempty"`
	FirstName        string `json:"first_name,omitempty"`
	LastName         string `json:"last_name,omitempty"`
	Role             *Role  `json:"role,omitempty"`
}

type TelegramIssueCodeResponse struct {
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
}

type TelegramMockCodeLoginRequest struct {
	Code string `json:"code"`
}

type TelegramIdentity struct {
	TelegramID int64
	Username   string
	FirstName  string
	LastName   string
}

type TelegramLoginCode struct {
	SessionID        string
	CodeHash         []byte
	TelegramUserID   int64
	TelegramUsername string
	Role             Role
	ExpiresAt        time.Time
	IssuedBy         string
	ConsumedAt       *time.Time
}
