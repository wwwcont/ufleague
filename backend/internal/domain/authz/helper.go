package authz

import "football_ui/backend/internal/domain"

type Checker struct{}

func NewChecker() Checker {
	return Checker{}
}

func (Checker) HasRole(user domain.User, role domain.Role) bool {
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func (Checker) HasPermission(user domain.User, permission string) bool {
	for _, p := range user.Permissions {
		if p == permission {
			return true
		}
	}
	return false
}
