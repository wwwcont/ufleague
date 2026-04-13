package cabinetadmin

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/policy"
)

type Repository interface {
	GetProfile(ctx context.Context, userID int64) (domain.UserProfile, error)
	UpdateProfile(ctx context.Context, userID int64, req domain.UpdateProfileRequest) (domain.UserProfile, error)
	GetTeamByID(ctx context.Context, teamID int64) (domain.Team, error)
	FindUserByUsername(ctx context.Context, username string) (int64, error)
	CreateTeamInvite(ctx context.Context, teamID, invitedID, byID int64) error
	EnsureUserRole(ctx context.Context, userID int64, role domain.Role) error
	UpdateTeamSocials(ctx context.Context, teamID int64, socials map[string]string) error
	SetPlayerVisible(ctx context.Context, playerID int64, visible bool) error
	TransferCaptain(ctx context.Context, teamID int64, newCaptain *int64) error
	ModerateDeleteComment(ctx context.Context, commentID int64) error
	ReplaceUserRoles(ctx context.Context, userID int64, roles []domain.Role) error
	ReplaceUserPermissions(ctx context.Context, userID int64, perms []string) error
	ReplaceUserRestrictions(ctx context.Context, userID int64, rs []string) error
	UpsertGlobalSetting(ctx context.Context, key string, value map[string]any, by int64) error
	AddAuditLog(ctx context.Context, actor int64, action, targetType, targetID string, metadata map[string]any) error
	GetPlayerByUserID(ctx context.Context, userID int64) (*domain.Player, error)
	CreateCaptainPlayerProfile(ctx context.Context, userID, teamID int64, displayName string) error
	ReassignPlayerTeam(ctx context.Context, playerID, teamID int64) error
	ListAuditActionsByActor(ctx context.Context, userID int64, limit int) ([]domain.UserActionItem, error)
}

type Service struct {
	repo   Repository
	policy policy.Engine
}

func NewService(repo Repository) Service {
	return Service{repo: repo, policy: policy.New()}
}

func (s Service) GetMyProfile(ctx context.Context, user domain.User) (domain.UserProfile, error) {
	return s.repo.GetProfile(ctx, user.ID)
}
func (s Service) UpdateMyProfile(ctx context.Context, user domain.User, req domain.UpdateProfileRequest) (domain.UserProfile, error) {
	if len(req.DisplayName) > 80 || len(req.Bio) > 1000 || len(req.FirstName) > 30 || len(req.LastName) > 30 {
		return domain.UserProfile{}, fmt.Errorf("validation failed")
	}
	before, err := s.repo.GetProfile(ctx, user.ID)
	if err != nil {
		return domain.UserProfile{}, err
	}
	updated, err := s.repo.UpdateProfile(ctx, user.ID, req)
	if err != nil {
		return domain.UserProfile{}, err
	}
	_ = s.repo.AddAuditLog(ctx, user.ID, "user.profile_update", "user", strconv.FormatInt(user.ID, 10), map[string]any{
		"display_name": map[string]string{"from": before.DisplayName, "to": updated.DisplayName},
		"first_name":   map[string]string{"from": before.FirstName, "to": updated.FirstName},
		"last_name":    map[string]string{"from": before.LastName, "to": updated.LastName},
		"avatar_url":   map[string]string{"from": before.AvatarURL, "to": updated.AvatarURL},
	})
	return updated, nil
}
func (s Service) AdminGetUserProfile(ctx context.Context, actor domain.User, userID int64) (domain.UserProfile, error) {
	if !s.policy.CanAdminModerate(actor) {
		return domain.UserProfile{}, fmt.Errorf("forbidden")
	}
	return s.repo.GetProfile(ctx, userID)
}
func (s Service) AdminUpdateUserProfile(ctx context.Context, actor domain.User, userID int64, req domain.UpdateProfileRequest) (domain.UserProfile, error) {
	if !s.policy.CanAdminModerate(actor) {
		return domain.UserProfile{}, fmt.Errorf("forbidden")
	}
	if len(req.DisplayName) > 80 || len(req.Bio) > 1000 || len(req.FirstName) > 30 || len(req.LastName) > 30 {
		return domain.UserProfile{}, fmt.Errorf("validation failed")
	}
	before, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return domain.UserProfile{}, err
	}
	updated, err := s.repo.UpdateProfile(ctx, userID, req)
	if err != nil {
		return domain.UserProfile{}, err
	}
	if err = s.repo.AddAuditLog(ctx, actor.ID, "admin.user_profile_update", "user", strconv.FormatInt(userID, 10), map[string]any{
		"display_name": map[string]string{"from": before.DisplayName, "to": updated.DisplayName},
		"first_name":   map[string]string{"from": before.FirstName, "to": updated.FirstName},
		"last_name":    map[string]string{"from": before.LastName, "to": updated.LastName},
		"avatar_url":   map[string]string{"from": before.AvatarURL, "to": updated.AvatarURL},
	}); err != nil {
		return domain.UserProfile{}, err
	}
	return updated, nil
}

func (s Service) CaptainInviteByUsername(ctx context.Context, actor domain.User, teamID int64, username string) error {
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if !s.policy.CanCaptainManageTeam(actor, team.CaptainUserID) {
		return fmt.Errorf("forbidden")
	}
	uid, err := s.repo.FindUserByUsername(ctx, username)
	if err != nil {
		return err
	}
	if err = s.repo.CreateTeamInvite(ctx, teamID, uid, actor.ID); err != nil {
		return err
	}
	if err = s.EnsureCaptainPlayerProfile(ctx, uid, teamID, username); err != nil {
		return err
	}
	if err = s.repo.EnsureUserRole(ctx, uid, domain.RolePlayer); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "captain.invite", "team", strconv.FormatInt(teamID, 10), map[string]any{"username": username})
}
func (s Service) CaptainUpdateTeamSocials(ctx context.Context, actor domain.User, teamID int64, socials map[string]string) error {
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if !s.policy.CanCaptainManageTeam(actor, team.CaptainUserID) {
		return fmt.Errorf("forbidden")
	}
	if err = s.repo.UpdateTeamSocials(ctx, teamID, socials); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "captain.team_socials", "team", strconv.FormatInt(teamID, 10), nil)
}
func (s Service) CaptainManageRosterVisibility(ctx context.Context, actor domain.User, teamID, playerID int64, visible bool) error {
	team, err := s.repo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if !s.policy.CanCaptainManageTeam(actor, team.CaptainUserID) {
		return fmt.Errorf("forbidden")
	}
	if err = s.repo.SetPlayerVisible(ctx, playerID, visible); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "captain.roster_visibility", "player", strconv.FormatInt(playerID, 10), map[string]any{"visible": visible})
}

func (s Service) AdminModerateComment(ctx context.Context, actor domain.User, commentID int64) error {
	if !s.policy.CanAdminModerate(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.ModerateDeleteComment(ctx, commentID); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "admin.comment_delete", "comment", strconv.FormatInt(commentID, 10), nil)
}
func (s Service) AdminTransferCaptain(ctx context.Context, actor domain.User, teamID int64, newCaptain *int64) error {
	if !s.policy.CanAdminModerate(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.TransferCaptain(ctx, teamID, newCaptain); err != nil {
		return err
	}
	if newCaptain != nil {
		if err := s.EnsureCaptainPlayerProfile(ctx, *newCaptain, teamID, "Captain"); err != nil {
			return err
		}
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "admin.transfer_captain", "team", strconv.FormatInt(teamID, 10), map[string]any{"new_captain": newCaptain})
}
func (s Service) AdminBlockComments(ctx context.Context, actor domain.User, userID int64, req domain.CommentBlockRequest) error {
	if !s.policy.CanAdminModerate(actor) {
		return fmt.Errorf("forbidden")
	}
	r := []string{"comments:banned"}
	if req.Permanent {
		r = []string{"comments:banned:permanent"}
	} else if req.UntilUnix > 0 {
		r = []string{"comments:cooldown_until:" + strconv.FormatInt(req.UntilUnix, 10)}
	}
	if err := s.repo.ReplaceUserRestrictions(ctx, userID, r); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "admin.comment_block", "user", strconv.FormatInt(userID, 10), map[string]any{"permanent": req.Permanent, "until": req.UntilUnix, "reason": req.Reason})
}

func (s Service) SuperadminAssignRoles(ctx context.Context, actor domain.User, userID int64, req domain.AssignRolesRequest) error {
	if !s.policy.CanSuperadminManageIAM(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.ReplaceUserRoles(ctx, userID, req.Roles); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "superadmin.assign_roles", "user", strconv.FormatInt(userID, 10), map[string]any{"roles": req.Roles})
}
func (s Service) SuperadminAssignPermissions(ctx context.Context, actor domain.User, userID int64, req domain.AssignPermissionsRequest) error {
	if !s.policy.CanSuperadminManageIAM(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.ReplaceUserPermissions(ctx, userID, req.Permissions); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "superadmin.assign_permissions", "user", strconv.FormatInt(userID, 10), map[string]any{"permissions": req.Permissions})
}
func (s Service) SuperadminAssignRestrictions(ctx context.Context, actor domain.User, userID int64, req domain.AssignRestrictionsRequest) error {
	if !s.policy.CanSuperadminManageIAM(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.ReplaceUserRestrictions(ctx, userID, req.Restrictions); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "superadmin.assign_restrictions", "user", strconv.FormatInt(userID, 10), map[string]any{"restrictions": req.Restrictions})
}
func (s Service) SuperadminSetGlobalSetting(ctx context.Context, actor domain.User, key string, req domain.UpdateGlobalSettingRequest) error {
	if !s.policy.CanSuperadminManageIAM(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.UpsertGlobalSetting(ctx, key, req.Value, actor.ID); err != nil {
		return err
	}
	return s.repo.AddAuditLog(ctx, actor.ID, "superadmin.global_setting", "setting", key, map[string]any{"at": time.Now().UTC()})
}

func (s Service) EnsureCaptainPlayerProfile(ctx context.Context, userID, teamID int64, fallbackDisplayName string) error {
	player, err := s.repo.GetPlayerByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if player == nil {
		displayName := fallbackDisplayName
		if displayName == "" {
			displayName = "Captain"
		}
		return s.repo.CreateCaptainPlayerProfile(ctx, userID, teamID, displayName)
	}
	if player.TeamID != nil && *player.TeamID == teamID {
		return nil
	}
	return s.repo.ReassignPlayerTeam(ctx, player.ID, teamID)
}

func (s Service) GetMyActions(ctx context.Context, user domain.User, limit int) ([]domain.UserActionItem, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	return s.repo.ListAuditActionsByActor(ctx, user.ID, limit)
}
