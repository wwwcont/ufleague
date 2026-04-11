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
	TelegramName string    `json:"telegram_username,omitempty"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"display_name"`
	IsActive     bool      `json:"is_active"`
	Roles        []Role    `json:"roles"`
	Permissions  []string  `json:"permissions"`
	Restrictions []string  `json:"restrictions"`
	CreatedAt    time.Time `json:"created_at"`
}

type PublicUserCard struct {
	ID              int64    `json:"id"`
	DisplayName     string   `json:"display_name"`
	TelegramUsername string  `json:"telegram_username,omitempty"`
	Roles           []Role   `json:"roles"`
	LastSeenAt      *time.Time `json:"last_seen_at,omitempty"`
	IsOnline        bool     `json:"is_online"`
	PlayerID        *int64   `json:"player_id,omitempty"`
	TeamID          *int64   `json:"team_id,omitempty"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    int64     `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}
