package domain

import "time"

type NotificationType string

const (
	NotificationTeamEvent        NotificationType = "team_event"
	NotificationGlobalEvent      NotificationType = "global_event"
	NotificationCommentReply     NotificationType = "comment_reply"
	NotificationPlayerCommentNew NotificationType = "player_comment_new"
)

type NotificationSubscription struct {
	ID               int64            `json:"id"`
	UserID           int64            `json:"user_id"`
	NotificationType NotificationType `json:"notification_type"`
	ScopeType        string           `json:"scope_type,omitempty"`
	ScopeID          *int64           `json:"scope_id,omitempty"`
	TelegramChatID   *int64           `json:"telegram_chat_id,omitempty"`
	IsEnabled        bool             `json:"is_enabled"`
	CreatedAt        time.Time        `json:"created_at"`
}

type NotificationJob struct {
	ID               int64            `json:"id"`
	UserID           int64            `json:"user_id"`
	NotificationType NotificationType `json:"notification_type"`
	Payload          map[string]any   `json:"payload"`
	Status           string           `json:"status"`
	Attempts         int              `json:"attempts"`
	AvailableAt      time.Time        `json:"available_at"`
	CreatedAt        time.Time        `json:"created_at"`
}

type NotificationJobStatus string

const (
	NotificationJobPending    NotificationJobStatus = "pending"
	NotificationJobProcessing NotificationJobStatus = "processing"
	NotificationJobSent       NotificationJobStatus = "sent"
	NotificationJobFailed     NotificationJobStatus = "failed"
)

type TelegramRecipient struct {
	UserID int64 `json:"user_id"`
	ChatID int64 `json:"chat_id"`
}

type UserNotificationItem struct {
	ID               int64            `json:"id"`
	NotificationType NotificationType `json:"notification_type"`
	Title            string           `json:"title"`
	Body             string           `json:"body"`
	Route            string           `json:"route"`
	Status           string           `json:"status"`
	CreatedAt        int64            `json:"created_at"`
}
