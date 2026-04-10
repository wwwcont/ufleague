package domain

import "time"

type CommentEntityType string

const (
	CommentEntityMatch  CommentEntityType = "match"
	CommentEntityTeam   CommentEntityType = "team"
	CommentEntityPlayer CommentEntityType = "player"
	CommentEntityEvent  CommentEntityType = "event"
)

type ReactionType string

const (
	ReactionLike    ReactionType = "like"
	ReactionDislike ReactionType = "dislike"
)

type Comment struct {
	ID              int64             `json:"id"`
	EntityType      CommentEntityType `json:"entity_type"`
	EntityID        int64             `json:"entity_id"`
	ParentCommentID *int64            `json:"parent_comment_id,omitempty"`
	AuthorUserID    int64             `json:"author_user_id"`
	AuthorName      string            `json:"author_name"`
	Body            string            `json:"body"`
	EditedAt        *time.Time        `json:"edited_at,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	DeletedAt       *time.Time        `json:"deleted_at,omitempty"`
	LikeCount       int               `json:"like_count"`
	DislikeCount    int               `json:"dislike_count"`
}

type CreateCommentRequest struct {
	EntityType CommentEntityType `json:"entity_type"`
	EntityID   int64             `json:"entity_id"`
	Body       string            `json:"body"`
}

type ReplyCommentRequest struct {
	Body string `json:"body"`
}

type SetReactionRequest struct {
	ReactionType ReactionType `json:"reaction_type"`
}

type CommentAuthorState struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Role           Role   `json:"role"`
	IsGuest        bool   `json:"is_guest"`
	CanComment     bool   `json:"can_comment"`
	CooldownSecond int    `json:"cooldown_seconds"`
	BlockedReason  string `json:"blocked_reason,omitempty"`
}
