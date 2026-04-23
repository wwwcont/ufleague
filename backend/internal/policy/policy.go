package policy

import "football_ui/backend/internal/domain"

type Engine struct{}

func New() Engine { return Engine{} }

func (Engine) IsCaptain(user domain.User) bool    { return hasRole(user, domain.RoleCaptain) }
func (Engine) IsAdmin(user domain.User) bool      { return hasRole(user, domain.RoleAdmin) }
func (Engine) IsSuperadmin(user domain.User) bool { return hasRole(user, domain.RoleSuperadmin) }

func (e Engine) CanCaptainManageTeam(user domain.User, teamCaptainID *int64) bool {
	if e.IsAdmin(user) || e.IsSuperadmin(user) {
		return true
	}
	if !e.IsCaptain(user) || teamCaptainID == nil {
		return false
	}
	return *teamCaptainID == user.ID
}
func (e Engine) CanAdminModerate(user domain.User) bool {
	return e.IsAdmin(user) || e.IsSuperadmin(user)
}
func (e Engine) CanSuperadminManageIAM(user domain.User) bool { return e.IsSuperadmin(user) }
func (e Engine) HasPermission(user domain.User, permission string) bool {
	if e.IsSuperadmin(user) {
		return true
	}
	for _, p := range user.Permissions {
		if p == permission {
			return true
		}
	}
	return false
}

func (e Engine) CanIssueCommentBan(user domain.User) bool {
	return e.HasPermission(user, domain.PermCommentBanIssue)
}
func (e Engine) CanAssignPlayerRole(user domain.User) bool {
	return e.HasPermission(user, domain.PermRolePlayerAssign)
}
func (e Engine) CanAssignCaptainRole(user domain.User) bool {
	return e.HasPermission(user, domain.PermRoleCaptainAssign)
}
func (e Engine) CanRevokePlayerRole(user domain.User) bool {
	return e.HasPermission(user, domain.PermRolePlayerRevoke)
}
func (e Engine) CanRevokeCaptainRole(user domain.User) bool {
	return e.HasPermission(user, domain.PermRoleCaptainRevoke)
}
func (e Engine) CanEditPlayoffGrid(user domain.User) bool {
	return e.HasPermission(user, domain.PermPlayoffGridEdit)
}
func (e Engine) CanEditTournament(user domain.User) bool {
	return e.HasPermission(user, domain.PermTournamentEdit)
}
func (e Engine) CanManageManualStats(user domain.User) bool {
	return e.HasPermission(user, domain.PermStatsManualManage)
}
func (e Engine) CanCreateEventsEverywhere(user domain.User) bool {
	return e.HasPermission(user, domain.PermEventFullCreate)
}
func (e Engine) CanManageMatchScore(user domain.User) bool {
	return e.HasPermission(user, domain.PermMatchScoreManage)
}
func (e Engine) CanManageArchive(user domain.User) bool {
	return e.HasPermission(user, domain.PermArchiveManage)
}
func (e Engine) CanDeleteFromArchive(user domain.User) bool {
	return e.HasPermission(user, domain.PermArchiveDelete)
}
func (e Engine) CanCreateMatch(user domain.User) bool {
	return e.HasPermission(user, domain.PermMatchCreate)
}
func (e Engine) CanDeleteAnyComment(user domain.User) bool {
	return e.HasPermission(user, domain.PermCommentDeleteAny)
}
func (e Engine) CanManageAdminPermissions(user domain.User) bool {
	return e.HasPermission(user, domain.PermAdminPermsManage)
}

func hasRole(user domain.User, role domain.Role) bool {
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}
