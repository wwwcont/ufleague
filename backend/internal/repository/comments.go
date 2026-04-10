package repository

import (
	"context"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentsRepository struct{ pool *pgxpool.Pool }

func NewCommentsRepository(pool *pgxpool.Pool) *CommentsRepository {
	return &CommentsRepository{pool: pool}
}

func (r *CommentsRepository) ListByEntity(ctx context.Context, entityType domain.CommentEntityType, entityID int64) ([]domain.Comment, error) {
	rows, err := r.pool.Query(ctx, `
	SELECT c.id,c.entity_type,c.entity_id,c.parent_comment_id,c.author_user_id,COALESCE(u.display_name, u.username, 'user') as author_name,c.body,c.edited_at,c.created_at,c.updated_at,c.deleted_at,
	COALESCE(SUM(CASE WHEN cr.reaction_type='like' THEN 1 ELSE 0 END),0) AS like_count,
	COALESCE(SUM(CASE WHEN cr.reaction_type='dislike' THEN 1 ELSE 0 END),0) AS dislike_count
	FROM comments c
	JOIN users u ON u.id=c.author_user_id
	LEFT JOIN comment_reactions cr ON cr.comment_id=c.id
	WHERE c.entity_type=$1 AND c.entity_id=$2 AND c.deleted_at IS NULL
	GROUP BY c.id
	ORDER BY c.created_at ASC`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Comment{}
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *CommentsRepository) GetByID(ctx context.Context, id int64) (domain.Comment, error) {
	row := r.pool.QueryRow(ctx, `
	SELECT c.id,c.entity_type,c.entity_id,c.parent_comment_id,c.author_user_id,COALESCE(u.display_name, u.username, 'user') as author_name,c.body,c.edited_at,c.created_at,c.updated_at,c.deleted_at,
	COALESCE(SUM(CASE WHEN cr.reaction_type='like' THEN 1 ELSE 0 END),0) AS like_count,
	COALESCE(SUM(CASE WHEN cr.reaction_type='dislike' THEN 1 ELSE 0 END),0) AS dislike_count
	FROM comments c
	JOIN users u ON u.id=c.author_user_id
	LEFT JOIN comment_reactions cr ON cr.comment_id=c.id
	WHERE c.id=$1 AND c.deleted_at IS NULL
	GROUP BY c.id`, id)
	return scanComment(row)
}

func (r *CommentsRepository) Create(ctx context.Context, c domain.Comment) (domain.Comment, error) {
	row := r.pool.QueryRow(ctx, `
	INSERT INTO comments (entity_type,entity_id,parent_comment_id,author_user_id,body)
	VALUES ($1,$2,$3,$4,$5)
	RETURNING id,entity_type,entity_id,parent_comment_id,author_user_id,'' as author_name,body,edited_at,created_at,updated_at,deleted_at`,
		c.EntityType, c.EntityID, c.ParentCommentID, c.AuthorUserID, c.Body)
	var out domain.Comment
	err := row.Scan(&out.ID, &out.EntityType, &out.EntityID, &out.ParentCommentID, &out.AuthorUserID, &out.AuthorName, &out.Body, &out.EditedAt, &out.CreatedAt, &out.UpdatedAt, &out.DeletedAt)
	return out, err
}

func (r *CommentsRepository) SoftDelete(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE comments SET deleted_at=NOW(),updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	return err
}

func (r *CommentsRepository) SetReaction(ctx context.Context, commentID, userID int64, reaction domain.ReactionType) error {
	_, err := r.pool.Exec(ctx, `
	INSERT INTO comment_reactions (comment_id,user_id,reaction_type)
	VALUES ($1,$2,$3)
	ON CONFLICT (comment_id,user_id)
	DO UPDATE SET reaction_type=EXCLUDED.reaction_type, updated_at=NOW()`, commentID, userID, reaction)
	return err
}

func scanComment(row interface{ Scan(dest ...any) error }) (domain.Comment, error) {
	var c domain.Comment
	err := row.Scan(&c.ID, &c.EntityType, &c.EntityID, &c.ParentCommentID, &c.AuthorUserID, &c.AuthorName, &c.Body, &c.EditedAt, &c.CreatedAt, &c.UpdatedAt, &c.DeletedAt, &c.LikeCount, &c.DislikeCount)
	return c, err
}
