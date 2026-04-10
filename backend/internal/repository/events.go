package repository

import (
	"context"
	"encoding/json"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type EventsRepository struct{ pool *pgxpool.Pool }

func NewEventsRepository(pool *pgxpool.Pool) *EventsRepository { return &EventsRepository{pool: pool} }

func (r *EventsRepository) ListEvents(ctx context.Context) ([]domain.EventFeedItem, error) {
	rows, err := r.pool.Query(ctx, `
	SELECT id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned, created_at, updated_at, deleted_at
	FROM event_feed_items
	WHERE deleted_at IS NULL
	ORDER BY is_pinned DESC, created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.EventFeedItem{}
	for rows.Next() {
		it, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *EventsRepository) GetEvent(ctx context.Context, id int64) (domain.EventFeedItem, error) {
	row := r.pool.QueryRow(ctx, `
	SELECT id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned, created_at, updated_at, deleted_at
	FROM event_feed_items
	WHERE id=$1 AND deleted_at IS NULL`, id)
	return scanEvent(row)
}

func (r *EventsRepository) CreateEvent(ctx context.Context, ev domain.EventFeedItem) (domain.EventFeedItem, error) {
	meta, _ := json.Marshal(ev.Metadata)
	row := r.pool.QueryRow(ctx, `
	INSERT INTO event_feed_items (scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	RETURNING id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned, created_at, updated_at, deleted_at`,
		ev.ScopeType, ev.ScopeID, ev.AuthorUserID, ev.Title, ev.Body, meta, ev.Visibility, ev.IsPinned)
	return scanEvent(row)
}

func (r *EventsRepository) UpdateEvent(ctx context.Context, id int64, ev domain.EventFeedItem) (domain.EventFeedItem, error) {
	meta, _ := json.Marshal(ev.Metadata)
	row := r.pool.QueryRow(ctx, `
	UPDATE event_feed_items
	SET scope_type=$2, scope_id=$3, title=$4, body=$5, metadata=$6, visibility=$7, is_pinned=$8, updated_at=NOW()
	WHERE id=$1 AND deleted_at IS NULL
	RETURNING id, scope_type, scope_id, author_user_id, title, body, metadata, visibility, is_pinned, created_at, updated_at, deleted_at`,
		id, ev.ScopeType, ev.ScopeID, ev.Title, ev.Body, meta, ev.Visibility, ev.IsPinned)
	return scanEvent(row)
}

func (r *EventsRepository) SoftDeleteEvent(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE event_feed_items SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	return err
}

func (r *EventsRepository) TeamCaptainByTeamID(ctx context.Context, teamID int64) (*int64, error) {
	var captain *int64
	err := r.pool.QueryRow(ctx, `SELECT captain_user_id FROM teams WHERE id=$1`, teamID).Scan(&captain)
	return captain, err
}

func (r *EventsRepository) TeamCaptainByPlayerID(ctx context.Context, playerID int64) (*int64, error) {
	var captain *int64
	err := r.pool.QueryRow(ctx, `
	SELECT t.captain_user_id
	FROM players p
	LEFT JOIN teams t ON t.id = p.team_id
	WHERE p.id=$1`, playerID).Scan(&captain)
	return captain, err
}

func (r *EventsRepository) EventAuthor(ctx context.Context, eventID int64) (int64, error) {
	var author int64
	err := r.pool.QueryRow(ctx, `SELECT author_user_id FROM event_feed_items WHERE id=$1 AND deleted_at IS NULL`, eventID).Scan(&author)
	return author, err
}

func scanEvent(row interface{ Scan(dest ...any) error }) (domain.EventFeedItem, error) {
	var ev domain.EventFeedItem
	var meta []byte
	err := row.Scan(&ev.ID, &ev.ScopeType, &ev.ScopeID, &ev.AuthorUserID, &ev.Title, &ev.Body, &meta, &ev.Visibility, &ev.IsPinned, &ev.CreatedAt, &ev.UpdatedAt, &ev.DeletedAt)
	if err != nil {
		return ev, err
	}
	ev.Metadata = map[string]any{}
	_ = json.Unmarshal(meta, &ev.Metadata)
	return ev, nil
}
