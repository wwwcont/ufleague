package telegramauth

import (
	"reflect"
	"testing"

	"football_ui/backend/internal/domain"
)

func TestMergeLoginRoles(t *testing.T) {
	tests := []struct {
		name      string
		existing  []domain.Role
		requested domain.Role
		want      []domain.Role
	}{
		{
			name:      "keeps existing privileged role when requested guest",
			existing:  []domain.Role{domain.RolePlayer},
			requested: domain.RoleGuest,
			want:      []domain.Role{domain.RolePlayer},
		},
		{
			name:      "adds requested role when user has no roles",
			existing:  nil,
			requested: domain.RoleGuest,
			want:      []domain.Role{domain.RoleGuest},
		},
		{
			name:      "adds non guest requested role",
			existing:  []domain.Role{domain.RoleGuest},
			requested: domain.RolePlayer,
			want:      []domain.Role{domain.RoleGuest, domain.RolePlayer},
		},
		{
			name:      "deduplicates roles",
			existing:  []domain.Role{domain.RoleGuest, domain.RolePlayer, domain.RolePlayer},
			requested: domain.RolePlayer,
			want:      []domain.Role{domain.RoleGuest, domain.RolePlayer},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mergeLoginRoles(tt.existing, tt.requested)
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("mergeLoginRoles() = %v, want %v", got, tt.want)
			}
		})
	}
}
