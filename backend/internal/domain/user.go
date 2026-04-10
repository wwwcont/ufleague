package domain

import "time"

type Role string

const (
	RoleGuest      Role = "guest"
	RolePlayer     Role = "player"
	RoleCaptain    Role = "captain"
	RoleAdmin      Role = "admin"
	RoleSuperadmin Role = "superadmin"
)

type User struct {
	ID           int64     `json:"id"`
	TelegramID   *int64    `json:"telegram_id,omitempty"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"display_name"`
	IsActive     bool      `json:"is_active"`
	Roles        []Role    `json:"roles"`
	Permissions  []string  `json:"permissions"`
	Restrictions []string  `json:"restrictions"`
	CreatedAt    time.Time `json:"created_at"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    int64     `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}
