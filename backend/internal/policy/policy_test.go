package policy

import (
	"testing"

	"football_ui/backend/internal/domain"
)

func TestCanCaptainManageTeamAllowsAdminsAndSuperadmins(t *testing.T) {
	captainID := int64(100)
	engine := New()

	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}
	if !engine.CanCaptainManageTeam(admin, &captainID) {
		t.Fatalf("admin should be allowed to manage team")
	}

	superadmin := domain.User{ID: 2, Roles: []domain.Role{domain.RoleSuperadmin}}
	if !engine.CanCaptainManageTeam(superadmin, nil) {
		t.Fatalf("superadmin should be allowed even without explicit captain id")
	}
}

func TestCanCaptainManageTeamForCaptainOwnership(t *testing.T) {
	engine := New()
	captainID := int64(10)

	captain := domain.User{ID: captainID, Roles: []domain.Role{domain.RoleCaptain}}
	if !engine.CanCaptainManageTeam(captain, &captainID) {
		t.Fatalf("captain should be allowed for own team")
	}

	anotherCaptainID := int64(11)
	if engine.CanCaptainManageTeam(captain, &anotherCaptainID) {
		t.Fatalf("captain should not be allowed for another team")
	}
}

func TestHasPermissionAllowsSuperadminWithoutExplicitPermission(t *testing.T) {
	engine := New()
	superadmin := domain.User{ID: 2, Roles: []domain.Role{domain.RoleSuperadmin}}
	if !engine.HasPermission(superadmin, domain.PermMatchCreate) {
		t.Fatalf("superadmin should be allowed for any permission")
	}
}

func TestHasPermissionRespectsExplicitPermissions(t *testing.T) {
	engine := New()
	admin := domain.User{
		ID:          1,
		Roles:       []domain.Role{domain.RoleAdmin},
		Permissions: []string{domain.PermMatchCreate},
	}
	if !engine.CanCreateMatch(admin) {
		t.Fatalf("admin with explicit match.create permission should be allowed")
	}
	if engine.CanDeleteFromArchive(admin) {
		t.Fatalf("admin without archive.delete permission should be denied")
	}
}

func TestCanManageAdminPermissions(t *testing.T) {
	engine := New()
	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}, Permissions: []string{domain.PermAdminPermsManage}}
	if !engine.CanManageAdminPermissions(admin) {
		t.Fatalf("expected admin.permissions.manage to allow delegated admin permissions management")
	}
}

func TestCanViewUserAccessMatrix(t *testing.T) {
	engine := New()
	superadmin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleSuperadmin}}
	if !engine.CanViewUserAccessMatrix(superadmin) {
		t.Fatalf("superadmin should be allowed to view user access matrix")
	}
	adminWithoutPermission := domain.User{ID: 2, Roles: []domain.Role{domain.RoleAdmin}}
	if engine.CanViewUserAccessMatrix(adminWithoutPermission) {
		t.Fatalf("admin without admin.permissions.manage should not be allowed to view user access matrix")
	}
	adminWithPermission := domain.User{ID: 3, Roles: []domain.Role{domain.RoleAdmin}, Permissions: []string{domain.PermAdminPermsManage}}
	if !engine.CanViewUserAccessMatrix(adminWithPermission) {
		t.Fatalf("admin with admin.permissions.manage should be allowed to view user access matrix")
	}
}
