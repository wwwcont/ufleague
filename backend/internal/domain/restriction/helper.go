package restriction

import "football_ui/backend/internal/domain"

type Checker struct{}

func NewChecker() Checker {
	return Checker{}
}

func (Checker) IsRestricted(user domain.User, restriction string) bool {
	for _, r := range user.Restrictions {
		if r == restriction {
			return true
		}
	}
	return false
}
