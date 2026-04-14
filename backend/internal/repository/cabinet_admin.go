package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
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
	SELECT
		u.id,
		u.username,
		COALESCE(u.telegram_id, 0),
		COALESCE(u.telegram_username, ''),
		u.display_name,
		COALESCE(up.first_name, ''),
		COALESCE(up.last_name, ''),
		COALESCE(up.bio,''),
		COALESCE(up.avatar_url,''),
		COALESCE(up.socials,'{}'::jsonb)
	FROM users u LEFT JOIN user_profiles up ON up.user_id=u.id WHERE u.id=$1`, userID).Scan(
		&p.UserID,
		&p.Username,
		&p.TelegramID,
		&p.TelegramTag,
		&p.DisplayName,
		&p.FirstName,
		&p.LastName,
		&p.Bio,
		&p.AvatarURL,
		&socials,
	)
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
	INSERT INTO user_profiles (user_id,first_name,last_name,bio,avatar_url,socials,updated_at)
	VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,NOW())
	ON CONFLICT (user_id)
	DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, bio=EXCLUDED.bio, avatar_url=EXCLUDED.avatar_url, socials=EXCLUDED.socials, updated_at=NOW()`, userID, req.FirstName, req.LastName, req.Bio, req.AvatarURL, socials)
	if err != nil {
		return domain.UserProfile{}, err
	}
	fullName := strings.TrimSpace(strings.TrimSpace(req.FirstName + " " + req.LastName))
	if fullName == "" {
		fullName = strings.TrimSpace(req.DisplayName)
	}
	age := ""
	if birthDate := strings.TrimSpace(req.Socials["birth_date"]); birthDate != "" {
		if parsed, err := time.Parse("02.01.2006", birthDate); err == nil {
			years := int(time.Since(parsed).Hours() / 24 / 365.25)
			if years > 0 {
				age = strconv.Itoa(years)
			}
		}
	}
	if fullName != "" {
		if age != "" {
			_, _ = r.pool.Exec(ctx, `
				UPDATE players
				SET full_name=$2, avatar_url=NULLIF($3,''), socials=jsonb_set(COALESCE(socials,'{}'::jsonb), '{age}', to_jsonb($4::text), true), updated_at=NOW()
				WHERE user_id=$1
			`, userID, fullName, req.AvatarURL, age)
		} else {
			_, _ = r.pool.Exec(ctx, `
				UPDATE players
				SET full_name=$2, avatar_url=NULLIF($3,''), updated_at=NOW()
				WHERE user_id=$1
			`, userID, fullName, req.AvatarURL)
		}
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
func (r *CabinetAdminRepository) EnsureUserRole(ctx context.Context, userID int64, role domain.Role) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE code = $2
		ON CONFLICT DO NOTHING
	`, userID, role)
	return err
}
func (r *CabinetAdminRepository) RevokeUserRole(ctx context.Context, userID int64, role domain.Role) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM user_roles ur
		USING roles r
		WHERE ur.user_id=$1 AND ur.role_id=r.id AND r.code=$2
	`, userID, role)
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
func (r *CabinetAdminRepository) TransferCaptain(ctx context.Context, teamID int64, newCaptain *int64) error {
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
	firstName := ""
	lastName := ""
	avatarURL := ""
	birthDate := ""
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(up.first_name,''), COALESCE(up.last_name,''), COALESCE(up.avatar_url,''), COALESCE(up.socials->>'birth_date','')
		FROM users u
		LEFT JOIN user_profiles up ON up.user_id = u.id
		WHERE u.id=$1
	`, userID).Scan(&firstName, &lastName, &avatarURL, &birthDate)
	fullName := strings.TrimSpace(strings.TrimSpace(firstName + " " + lastName))
	if fullName == "" {
		fullName = strings.TrimSpace(displayName)
	}
	if fullName == "" {
		fullName = "Player"
	}
	socials := map[string]string{}
	if birthDate != "" {
		if parsed, err := time.Parse("02.01.2006", birthDate); err == nil {
			years := int(time.Since(parsed).Hours() / 24 / 365.25)
			if years > 0 {
				socials["age"] = strconv.Itoa(years)
			}
		}
	}
	tr := NewTournamentRepository(r.pool)
	_, err := tr.CreatePlayer(ctx, domain.Player{
		UserID:      &userID,
		TeamID:      &teamID,
		FullName:    fullName,
		Position:    "MF",
		ShirtNumber: &shirtNumber,
		AvatarURL:   avatarURL,
		Socials:     socials,
	})
	return err
}
func (r *CabinetAdminRepository) ReassignPlayerTeam(ctx context.Context, playerID, teamID int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE players SET team_id=$2, updated_at=NOW() WHERE id=$1`, playerID, teamID)
	return err
}
func (r *CabinetAdminRepository) DetachPlayerFromUser(ctx context.Context, userID int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE players SET user_id=NULL, updated_at=NOW() WHERE user_id=$1`, userID)
	return err
}
func (r *CabinetAdminRepository) CountTeamsByCaptain(ctx context.Context, userID int64) (int, error) {
	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM teams WHERE captain_user_id=$1`, userID).Scan(&total)
	return total, err
}
func (r *CabinetAdminRepository) ListAuditActionsByActor(ctx context.Context, userID int64, limit int) ([]domain.UserActionItem, error) {
	type actionRecord struct {
		id        int64
		action    string
		target    string
		targetID  string
		metadata  map[string]any
		createdAt time.Time
	}

	records := make([]actionRecord, 0, limit*2)

	var registeredAt time.Time
	if err := r.pool.QueryRow(ctx, `SELECT created_at FROM users WHERE id=$1`, userID).Scan(&registeredAt); err == nil {
		records = append(records, actionRecord{
			id:        0,
			action:    "auth.register",
			target:    "user",
			targetID:  strconv.FormatInt(userID, 10),
			metadata:  map[string]any{"source": "telegram"},
			createdAt: registeredAt,
		})
	}

	auditRows, err := r.pool.Query(ctx, `
		SELECT id, action, target_type, target_id, COALESCE(metadata, '{}'::jsonb), created_at
		FROM audit_logs
		WHERE actor_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer auditRows.Close()

	for auditRows.Next() {
		var metadataRaw []byte
		item := actionRecord{}
		if err = auditRows.Scan(&item.id, &item.action, &item.target, &item.targetID, &metadataRaw, &item.createdAt); err != nil {
			return nil, err
		}
		item.metadata = map[string]any{}
		_ = json.Unmarshal(metadataRaw, &item.metadata)
		records = append(records, item)
	}
	if err = auditRows.Err(); err != nil {
		return nil, err
	}

	commentRows, err := r.pool.Query(ctx, `
		SELECT id, entity_type, entity_id, parent_comment_id, body, created_at
		FROM comments
		WHERE author_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer commentRows.Close()
	for commentRows.Next() {
		var id, entityID int64
		var parentID *int64
		var entityType, body string
		var createdAt time.Time
		if err = commentRows.Scan(&id, &entityType, &entityID, &parentID, &body, &createdAt); err != nil {
			return nil, err
		}
		action := "comment.create"
		if parentID != nil {
			action = "comment.reply"
		}
		records = append(records, actionRecord{
			id:       -id,
			action:   action,
			target:   "comment",
			targetID: strconv.FormatInt(id, 10),
			metadata: map[string]any{
				"entity_type": entityType,
				"entity_id":   entityID,
				"body":        body,
			},
			createdAt: createdAt,
		})
	}
	if err = commentRows.Err(); err != nil {
		return nil, err
	}

	reactionRows, err := r.pool.Query(ctx, `
		SELECT cr.comment_id, cr.reaction_type, c.entity_type, c.entity_id, cr.updated_at
		FROM comment_reactions cr
		JOIN comments c ON c.id = cr.comment_id
		WHERE cr.user_id = $1
		ORDER BY cr.updated_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer reactionRows.Close()
	for reactionRows.Next() {
		var commentID, entityID int64
		var reactionType, entityType string
		var updatedAt time.Time
		if err = reactionRows.Scan(&commentID, &reactionType, &entityType, &entityID, &updatedAt); err != nil {
			return nil, err
		}
		records = append(records, actionRecord{
			id:       -1000000 - commentID,
			action:   "comment.react",
			target:   "comment",
			targetID: strconv.FormatInt(commentID, 10),
			metadata: map[string]any{
				"reaction_type": reactionType,
				"entity_type":   entityType,
				"entity_id":     entityID,
			},
			createdAt: updatedAt,
		})
	}
	if err = reactionRows.Err(); err != nil {
		return nil, err
	}

	eventRows, err := r.pool.Query(ctx, `
		SELECT id, scope_type, scope_id, title, created_at
		FROM event_feed_items
		WHERE author_user_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer eventRows.Close()
	for eventRows.Next() {
		var eventID int64
		var scopeType string
		var scopeID *int64
		var title string
		var createdAt time.Time
		if err = eventRows.Scan(&eventID, &scopeType, &scopeID, &title, &createdAt); err != nil {
			return nil, err
		}
		meta := map[string]any{"scope_type": scopeType, "title": title}
		if scopeID != nil {
			meta["scope_id"] = *scopeID
		}
		records = append(records, actionRecord{
			id:        -2000000 - eventID,
			action:    "event.create",
			target:    "event",
			targetID:  strconv.FormatInt(eventID, 10),
			metadata:  meta,
			createdAt: createdAt,
		})
	}
	if err = eventRows.Err(); err != nil {
		return nil, err
	}

	sort.Slice(records, func(i, j int) bool { return records[i].createdAt.After(records[j].createdAt) })
	if len(records) > limit {
		records = records[:limit]
	}

	out := make([]domain.UserActionItem, 0, len(records))
	for idx, record := range records {
		itemID := record.id
		if itemID == 0 {
			itemID = int64(-(idx + 1))
		}
		item := domain.UserActionItem{
			ID:         itemID,
			Action:     record.action,
			TargetType: record.target,
			TargetID:   record.targetID,
			Metadata:   record.metadata,
			CreatedAt:  record.createdAt.Unix(),
		}
		item.Route = actionRoute(item.TargetType, item.TargetID, item.Metadata)
		out = append(out, item)
	}
	return out, nil
}

func actionRoute(targetType, targetID string, metadata map[string]any) string {
	switch targetType {
	case "user":
		return "/users/" + targetID
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
