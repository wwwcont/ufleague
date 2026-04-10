package domain

import "time"

type EventScope string

const (
	EventScopeGlobal EventScope = "global"
	EventScopeTeam   EventScope = "team"
	EventScopePlayer EventScope = "player"
	EventScopeMatch  EventScope = "match"
)

type EventFeedItem struct {
	ID           int64          `json:"id"`
	ScopeType    EventScope     `json:"scope_type"`
	ScopeID      *int64         `json:"scope_id,omitempty"`
	AuthorUserID int64          `json:"author_user_id"`
	Title        string         `json:"title"`
	Body         string         `json:"body"`
	Metadata     map[string]any `json:"metadata"`
	Visibility   string         `json:"visibility"`
	IsPinned     bool           `json:"is_pinned"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    *time.Time     `json:"deleted_at,omitempty"`
}

type CreateEventRequest struct {
	ScopeType  EventScope     `json:"scope_type"`
	ScopeID    *int64         `json:"scope_id"`
	Title      string         `json:"title"`
	Body       string         `json:"body"`
	Metadata   map[string]any `json:"metadata"`
	Visibility string         `json:"visibility"`
	IsPinned   bool           `json:"is_pinned"`
}

type UpdateEventRequest = CreateEventRequest
