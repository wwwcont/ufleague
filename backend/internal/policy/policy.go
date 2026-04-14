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

func hasRole(user domain.User, role domain.Role) bool {
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}
