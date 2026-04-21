package cabinetadmin

import (
	"context"
	"errors"
	"testing"

	"football_ui/backend/internal/domain"
)

type fakeRepo struct {
	player             *domain.Player
	roles              []domain.Role
	team               domain.Team
	countTeams         int
	created            bool
	reassigned         bool
	detached           bool
	revokedPlayer      bool
	clearedCaptains    bool
	archivedTeamID     int64
	archivedValue      bool
	transferredTeamID  int64
	transferredCaptain *int64
	createdUserID      int64
	createdTeamID      int64
	reassignedPlayerID int64
	reassignedTeamID   int64
	auditCalled        bool
	auditErr           error
	replacedRoles      []domain.Role
	ensuredRoles       []domain.Role
}

func (f *fakeRepo) GetProfile(context.Context, int64) (domain.UserProfile, error) {
	return domain.UserProfile{}, nil
}
func (f *fakeRepo) UpdateProfile(context.Context, int64, domain.UpdateProfileRequest) (domain.UserProfile, error) {
	return domain.UserProfile{}, nil
}
func (f *fakeRepo) GetTeamByID(context.Context, int64) (domain.Team, error) {
	return f.team, nil
}
func (f *fakeRepo) FindUserByUsername(context.Context, string) (int64, error)   { return 0, nil }
func (f *fakeRepo) CreateTeamInvite(context.Context, int64, int64, int64) error { return nil }
func (f *fakeRepo) EnsureUserRole(_ context.Context, _ int64, role domain.Role) error {
	f.ensuredRoles = append(f.ensuredRoles, role)
	return nil
}
func (f *fakeRepo) UpdateTeamSocials(context.Context, int64, map[string]string) error { return nil }
func (f *fakeRepo) SetPlayerVisible(context.Context, int64, bool) error               { return nil }
func (f *fakeRepo) TransferCaptain(_ context.Context, teamID int64, newCaptain *int64) error {
	f.transferredTeamID = teamID
	f.transferredCaptain = newCaptain
	return nil
}
func (f *fakeRepo) ModerateDeleteComment(context.Context, int64) error { return nil }
func (f *fakeRepo) ReplaceUserRoles(_ context.Context, _ int64, roles []domain.Role) error {
	f.replacedRoles = append([]domain.Role{}, roles...)
	return nil
}
func (f *fakeRepo) ReplaceUserPermissions(context.Context, int64, []string) error  { return nil }
func (f *fakeRepo) ReplaceUserRestrictions(context.Context, int64, []string) error { return nil }
func (f *fakeRepo) UpsertGlobalSetting(context.Context, string, map[string]any, int64) error {
	return nil
}
func (f *fakeRepo) AddAuditLog(context.Context, int64, string, string, string, map[string]any) error {
	f.auditCalled = true
	return f.auditErr
}
func (f *fakeRepo) GetPlayerByUserID(context.Context, int64) (*domain.Player, error) {
	return f.player, nil
}
func (f *fakeRepo) CreateCaptainPlayerProfile(_ context.Context, userID, teamID int64, _ string) error {
	f.created = true
	f.createdUserID = userID
	f.createdTeamID = teamID
	return nil
}
func (f *fakeRepo) ReassignPlayerTeam(_ context.Context, playerID, teamID int64) error {
	f.reassigned = true
	f.reassignedPlayerID = playerID
	f.reassignedTeamID = teamID
	return nil
}
func (f *fakeRepo) RevokeUserRole(_ context.Context, _ int64, role domain.Role) error {
	if role == domain.RolePlayer {
		f.revokedPlayer = true
	}
	return nil
}
func (f *fakeRepo) DetachPlayerFromUser(context.Context, int64) error {
	f.detached = true
	return nil
}
func (f *fakeRepo) CountTeamsByCaptain(context.Context, int64) (int, error) { return f.countTeams, nil }
func (f *fakeRepo) ClearCaptainFromTeams(context.Context, int64) error {
	f.clearedCaptains = true
	return nil
}
func (f *fakeRepo) GetUserRoles(context.Context, int64) ([]domain.Role, error) { return f.roles, nil }
func (f *fakeRepo) SetTeamArchived(_ context.Context, teamID int64, archived bool) error {
	f.archivedTeamID = teamID
	f.archivedValue = archived
	return nil
}
func (f *fakeRepo) DeleteTeamWithDependencies(context.Context, int64) ([]int64, error) {
	return nil, nil
}
func (f *fakeRepo) ListAuditActionsByActor(context.Context, int64, int) ([]domain.UserActionItem, error) {
	return nil, nil
}
func (f *fakeRepo) ListEntityChangeHistory(context.Context, int) ([]domain.UserActionItem, error) {
	return nil, nil
}

func TestEnsureCaptainPlayerProfileCreatesProfileWhenMissing(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)

	if err := svc.EnsureCaptainPlayerProfile(context.Background(), 11, 22, "Captain Eleven"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.created {
		t.Fatalf("expected player profile to be created")
	}
	if repo.createdUserID != 11 || repo.createdTeamID != 22 {
		t.Fatalf("unexpected create payload: user=%d team=%d", repo.createdUserID, repo.createdTeamID)
	}
	if len(repo.ensuredRoles) == 0 || repo.ensuredRoles[0] != domain.RolePlayer {
		t.Fatalf("expected player role to be ensured, got %v", repo.ensuredRoles)
	}
}

func TestEnsureCaptainPlayerProfileReassignsTeamWhenDifferent(t *testing.T) {
	oldTeam := int64(7)
	repo := &fakeRepo{player: &domain.Player{ID: 100, UserID: ptr(10), TeamID: &oldTeam}}
	svc := NewService(repo)

	if err := svc.EnsureCaptainPlayerProfile(context.Background(), 10, 99, ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.reassigned {
		t.Fatalf("expected player team to be reassigned")
	}
	if repo.reassignedPlayerID != 100 || repo.reassignedTeamID != 99 {
		t.Fatalf("unexpected reassign payload: player=%d team=%d", repo.reassignedPlayerID, repo.reassignedTeamID)
	}
	if len(repo.ensuredRoles) == 0 || repo.ensuredRoles[0] != domain.RolePlayer {
		t.Fatalf("expected player role to be ensured, got %v", repo.ensuredRoles)
	}
}

func TestAdminUpdateUserProfileAddsAudit(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)

	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}
	_, err := svc.AdminUpdateUserProfile(context.Background(), admin, 77, domain.UpdateProfileRequest{DisplayName: "New Name", Bio: "Bio"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.auditCalled {
		t.Fatalf("expected audit log to be written")
	}
}

func TestAdminUpdateUserProfileReturnsAuditError(t *testing.T) {
	repo := &fakeRepo{auditErr: errors.New("audit failed")}
	svc := NewService(repo)

	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}
	_, err := svc.AdminUpdateUserProfile(context.Background(), admin, 77, domain.UpdateProfileRequest{DisplayName: "New Name"})
	if err == nil {
		t.Fatalf("expected error when audit log fails")
	}
}

func TestAdminAssignCaptainRoleRejectsExistingCaptain(t *testing.T) {
	repo := &fakeRepo{roles: []domain.Role{domain.RoleCaptain}}
	svc := NewService(repo)
	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	err := svc.AdminAssignCaptainRole(context.Background(), admin, 77)
	if !errors.Is(err, ErrUserAlreadyCaptain) {
		t.Fatalf("expected ErrUserAlreadyCaptain, got %v", err)
	}
}

func TestAdminAssignCaptainRoleDetachesPlayerWhenNoTeam(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)
	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	if err := svc.AdminAssignCaptainRole(context.Background(), admin, 77); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.detached {
		t.Fatalf("expected player to be detached")
	}
	if !repo.revokedPlayer {
		t.Fatalf("expected player role to be revoked")
	}
}

func TestAdminTransferCaptainRejectsWhenTeamHasAnotherCaptain(t *testing.T) {
	currentCaptain := int64(15)
	newCaptain := int64(20)
	repo := &fakeRepo{team: domain.Team{ID: 5, CaptainUserID: &currentCaptain}}
	svc := NewService(repo)
	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	err := svc.AdminTransferCaptain(context.Background(), admin, 5, &newCaptain)
	if !errors.Is(err, ErrTeamAlreadyHasCaptain) {
		t.Fatalf("expected ErrTeamAlreadyHasCaptain, got %v", err)
	}
}

func TestAdminRevokeCaptainRoleClearsTeams(t *testing.T) {
	repo := &fakeRepo{countTeams: 2, player: &domain.Player{ID: 88, UserID: ptr(77)}}
	svc := NewService(repo)
	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	if err := svc.AdminRevokeCaptainRole(context.Background(), admin, 77); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.clearedCaptains {
		t.Fatalf("expected captain to be cleared from teams")
	}
	if len(repo.ensuredRoles) == 0 || repo.ensuredRoles[0] != domain.RolePlayer {
		t.Fatalf("expected player role to be restored, got %v", repo.ensuredRoles)
	}
}

func TestAdminArchiveTeam(t *testing.T) {
	repo := &fakeRepo{}
	svc := NewService(repo)
	admin := domain.User{ID: 1, Roles: []domain.Role{domain.RoleAdmin}}

	if err := svc.AdminArchiveTeam(context.Background(), admin, 55, true); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.archivedTeamID != 55 || !repo.archivedValue {
		t.Fatalf("unexpected archive payload: team=%d archived=%v", repo.archivedTeamID, repo.archivedValue)
	}
}

func TestSuperadminAssignRolesPreservesCaptain(t *testing.T) {
	repo := &fakeRepo{roles: []domain.Role{domain.RoleCaptain, domain.RoleAdmin}}
	svc := NewService(repo)
	actor := domain.User{ID: 1, Roles: []domain.Role{domain.RoleSuperadmin}}

	err := svc.SuperadminAssignRoles(context.Background(), actor, 77, domain.AssignRolesRequest{Roles: []domain.Role{domain.RoleGuest}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.replacedRoles) != 2 {
		t.Fatalf("expected 2 roles after preserve, got %v", repo.replacedRoles)
	}
	if repo.replacedRoles[0] != domain.RoleGuest || repo.replacedRoles[1] != domain.RoleCaptain {
		t.Fatalf("unexpected roles: %v", repo.replacedRoles)
	}
}

func TestSuperadminAssignRolesDoesNotForceCaptainWhenAbsent(t *testing.T) {
	repo := &fakeRepo{roles: []domain.Role{domain.RoleGuest}}
	svc := NewService(repo)
	actor := domain.User{ID: 1, Roles: []domain.Role{domain.RoleSuperadmin}}

	err := svc.SuperadminAssignRoles(context.Background(), actor, 77, domain.AssignRolesRequest{Roles: []domain.Role{domain.RoleAdmin}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.replacedRoles) != 1 || repo.replacedRoles[0] != domain.RoleAdmin {
		t.Fatalf("unexpected roles: %v", repo.replacedRoles)
	}
}

func ptr(v int64) *int64 { return &v }
