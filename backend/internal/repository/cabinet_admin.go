package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"football_ui/backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CabinetAdminRepository struct{ pool *pgxpool.Pool }

func NewCabinetAdminRepository(pool *pgxpool.Pool) *CabinetAdminRepository {
	return &CabinetAdminRepository{pool: pool}
}

func (r *CabinetAdminRepository) GetProfile(ctx context.Context, userID int64) (domain.UserProfile, error) {
	var p domain.UserProfile
	var socials []byte
	err := r.pool.QueryRow(ctx, `
	SELECT u.id,u.username,u.display_name,COALESCE(up.bio,''),COALESCE(up.avatar_url,''),COALESCE(up.socials,'{}'::jsonb)
	FROM users u LEFT JOIN user_profiles up ON up.user_id=u.id WHERE u.id=$1`, userID).Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.AvatarURL, &socials)
	if err != nil {
		return p, err
	}
	p.Socials = map[string]string{}
	_ = json.Unmarshal(socials, &p.Socials)
	return p, nil
}

func (r *CabinetAdminRepository) UpdateProfile(ctx context.Context, userID int64, req domain.UpdateProfileRequest) (domain.UserProfile, error) {
	socials, _ := json.Marshal(req.Socials)
	_, err := r.pool.Exec(ctx, `UPDATE users SET display_name=$2, updated_at=NOW() WHERE id=$1`, userID, req.DisplayName)
	if err != nil {
		return domain.UserProfile{}, err
	}
	_, err = r.pool.Exec(ctx, `
	INSERT INTO user_profiles (user_id,bio,avatar_url,socials,updated_at)
	VALUES ($1,$2,NULLIF($3,''),$4,NOW())
	ON CONFLICT (user_id)
	DO UPDATE SET bio=EXCLUDED.bio, avatar_url=EXCLUDED.avatar_url, socials=EXCLUDED.socials, updated_at=NOW()`, userID, req.Bio, req.AvatarURL, socials)
	if err != nil {
		return domain.UserProfile{}, err
	}
	return r.GetProfile(ctx, userID)
}

func (r *CabinetAdminRepository) FindUserByUsername(ctx context.Context, username string) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `SELECT id FROM users WHERE username=$1`, username).Scan(&id)
	return id, err
}
func (r *CabinetAdminRepository) CreateTeamInvite(ctx context.Context, teamID, invitedID, byID int64) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO team_invites (team_id,invited_user_id,invited_by_user_id,status) VALUES ($1,$2,$3,'pending')`, teamID, invitedID, byID)
	return err
}
func (r *CabinetAdminRepository) UpdateTeamSocials(ctx context.Context, teamID int64, socials map[string]string) error {
	data, _ := json.Marshal(socials)
	_, err := r.pool.Exec(ctx, `UPDATE teams SET socials=$2, updated_at=NOW() WHERE id=$1`, teamID, data)
	return err
}
func (r *CabinetAdminRepository) SetPlayerVisible(ctx context.Context, playerID int64, visible bool) error {
	prefix := "hidden"
	if visible {
		prefix = "visible"
	}
	_, err := r.pool.Exec(ctx, `UPDATE players SET position=$2, updated_at=NOW() WHERE id=$1`, playerID, fmt.Sprintf("%s", prefix))
	return err
}
func (r *CabinetAdminRepository) TransferCaptain(ctx context.Context, teamID, newCaptain int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE teams SET captain_user_id=$2, updated_at=NOW() WHERE id=$1`, teamID, newCaptain)
	return err
}
func (r *CabinetAdminRepository) GetPlayerByUserID(ctx context.Context, userID int64) (*domain.Player, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id,user_id,team_id,full_name,COALESCE(nickname,''),COALESCE(avatar_url,''),socials,COALESCE(position,''),shirt_number,created_at,updated_at
		FROM players
		WHERE user_id = $1
		ORDER BY id DESC
		LIMIT 1
	`, userID)
	player, err := scanPlayer(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &player, nil
}
func (r *CabinetAdminRepository) CreateCaptainPlayerProfile(ctx context.Context, userID, teamID int64, displayName string) error {
	shirtNumber := 0
	tr := NewTournamentRepository(r.pool)
	_, err := tr.CreatePlayer(ctx, domain.Player{
		UserID:      &userID,
		TeamID:      &teamID,
		FullName:    displayName,
		Position:    "MF",
		ShirtNumber: &shirtNumber,
		Socials:     map[string]string{},
	})
	return err
}
func (r *CabinetAdminRepository) ReassignPlayerTeam(ctx context.Context, playerID, teamID int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE players SET team_id=$2, updated_at=NOW() WHERE id=$1`, playerID, teamID)
	return err
}
func (r *CabinetAdminRepository) ListAuditActionsByActor(ctx context.Context, userID int64, limit int) ([]domain.UserActionItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, action, target_type, target_id, COALESCE(metadata, '{}'::jsonb), created_at
		FROM audit_logs
		WHERE actor_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.UserActionItem, 0, limit)
	for rows.Next() {
		var item domain.UserActionItem
		var metadataRaw []byte
		var createdAt time.Time
		if err = rows.Scan(&item.ID, &item.Action, &item.TargetType, &item.TargetID, &metadataRaw, &createdAt); err != nil {
			return nil, err
		}
		item.CreatedAt = createdAt.Unix()
		item.Metadata = map[string]any{}
		_ = json.Unmarshal(metadataRaw, &item.Metadata)
		item.Route = actionRoute(item.TargetType, item.TargetID, item.Metadata)
		out = append(out, item)
	}
	return out, rows.Err()
}

func actionRoute(targetType, targetID string, metadata map[string]any) string {
	switch targetType {
	case "team":
		return "/teams/" + targetID
	case "player":
		return "/players/" + targetID
	case "event":
		return "/events/" + targetID
	case "comment":
		entityType, _ := metadata["entity_type"].(string)
		entityID := ""
		if raw := metadata["entity_id"]; raw != nil {
			switch typed := raw.(type) {
			case string:
				entityID = typed
			case float64:
				entityID = strconv.FormatInt(int64(typed), 10)
			}
		}
		if entityType != "" && entityID != "" {
			return "/comments/" + entityType + "/" + entityID + "#comment-" + targetID
		}
		return "/"
	default:
		return "/"
	}
}
func (r *CabinetAdminRepository) ModerateDeleteComment(ctx context.Context, commentID int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE comments SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, commentID)
	return err
}
func (r *CabinetAdminRepository) ReplaceUserRoles(ctx context.Context, userID int64, roles []domain.Role) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id=$1`, userID); err != nil {
		return err
	}
	for _, role := range roles {
		if _, err = tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT $1,id FROM roles WHERE code=$2`, userID, role); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
func (r *CabinetAdminRepository) ReplaceUserPermissions(ctx context.Context, userID int64, perms []string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM user_permissions WHERE user_id=$1`, userID)
	if err != nil {
		return err
	}
	for _, p := range perms {
		if _, err = r.pool.Exec(ctx, `INSERT INTO user_permissions (user_id, permission) VALUES ($1,$2)`, userID, p); err != nil {
			return err
		}
	}
	return nil
}
func (r *CabinetAdminRepository) ReplaceUserRestrictions(ctx context.Context, userID int64, rs []string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM user_restrictions WHERE user_id=$1`, userID)
	if err != nil {
		return err
	}
	for _, x := range rs {
		if _, err = r.pool.Exec(ctx, `INSERT INTO user_restrictions (user_id, restriction) VALUES ($1,$2)`, userID, x); err != nil {
			return err
		}
	}
	return nil
}
func (r *CabinetAdminRepository) UpsertGlobalSetting(ctx context.Context, key string, value map[string]any, by int64) error {
	data, _ := json.Marshal(value)
	_, err := r.pool.Exec(ctx, `INSERT INTO global_settings (key,value,updated_by,updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=NOW()`, key, data, by)
	return err
}
func (r *CabinetAdminRepository) AddAuditLog(ctx context.Context, actor int64, action, targetType, targetID string, metadata map[string]any) error {
	data, _ := json.Marshal(metadata)
	_, err := r.pool.Exec(ctx, `INSERT INTO audit_logs (actor_user_id,action,target_type,target_id,metadata) VALUES ($1,$2,$3,$4,$5)`, actor, action, targetType, targetID, data)
	return err
}
func (r *CabinetAdminRepository) GetTeamByID(ctx context.Context, teamID int64) (domain.Team, error) {
	tr := NewTournamentRepository(r.pool)
	return tr.GetTeam(ctx, teamID)
}
