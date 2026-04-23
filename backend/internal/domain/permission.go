package domain

const (
	PermCommentBanIssue   = "comments.ban.issue"
	PermRolePlayerAssign  = "role.player.assign"
	PermRoleCaptainAssign = "role.captain.assign"
	PermRolePlayerRevoke  = "role.player.revoke"
	PermRoleCaptainRevoke = "role.captain.revoke"
	PermPlayoffGridEdit   = "playoff.grid.edit"
	PermTournamentEdit    = "tournament.edit"
	PermStatsManualManage = "stats.manual.manage"
	PermEventFullCreate   = "event.full.create"
	PermMatchScoreManage  = "match.score.manage.full"
	PermArchiveManage     = "archive.manage"
	PermArchiveDelete     = "archive.delete"
	PermMatchCreate       = "match.create"
	PermCommentDeleteAny  = "comment.delete.any"
	PermAdminPermsManage  = "admin.permissions.manage"
)

var KnownPermissions = []string{
	PermCommentBanIssue,
	PermRolePlayerAssign,
	PermRoleCaptainAssign,
	PermRolePlayerRevoke,
	PermRoleCaptainRevoke,
	PermPlayoffGridEdit,
	PermTournamentEdit,
	PermStatsManualManage,
	PermEventFullCreate,
	PermMatchScoreManage,
	PermArchiveManage,
	PermArchiveDelete,
	PermMatchCreate,
	PermCommentDeleteAny,
	PermAdminPermsManage,
}

func IsKnownPermission(permission string) bool {
	for _, item := range KnownPermissions {
		if item == permission {
			return true
		}
	}
	return false
}
