package cabinetadmin

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/policy"
	"football_ui/backend/internal/repository"
)

type Service struct {
	repo   *repository.CabinetAdminRepository
	policy policy.Engine
}

func NewService(repo *repository.CabinetAdminRepository) Service {
	return Service{repo: repo, policy: policy.New()}
}

func (s Service) GetMyProfile(ctx context.Context, user domain.User) (domain.UserProfile, error) {
	return s.repo.GetProfile(ctx, user.ID)
}
func (s Service) UpdateMyProfile(ctx context.Context, user domain.User, req domain.UpdateProfileRequest) (domain.UserProfile, error) {
	if len(req.DisplayName) > 80 || len(req.Bio) > 1000 {
		return domain.UserProfile{}, fmt.Errorf("validation failed")
	}
	return s.repo.UpdateProfile(ctx, user.ID, req)
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
func (s Service) AdminTransferCaptain(ctx context.Context, actor domain.User, teamID, newCaptain int64) error {
	if !s.policy.CanAdminModerate(actor) {
		return fmt.Errorf("forbidden")
	}
	if err := s.repo.TransferCaptain(ctx, teamID, newCaptain); err != nil {
		return err
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
