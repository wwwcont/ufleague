package domain

type UserProfile struct {
	UserID      int64             `json:"user_id"`
	Username    string            `json:"username"`
	DisplayName string            `json:"display_name"`
	Bio         string            `json:"bio"`
	AvatarURL   string            `json:"avatar_url"`
	Socials     map[string]string `json:"socials"`
}

type UpdateProfileRequest struct {
	DisplayName string            `json:"display_name"`
	Bio         string            `json:"bio"`
	AvatarURL   string            `json:"avatar_url"`
	Socials     map[string]string `json:"socials"`
}

type CaptainInviteRequest struct {
	Username string `json:"username"`
}

type TransferCaptainRequest struct {
	NewCaptainUserID int64 `json:"new_captain_user_id"`
}

type CommentBlockRequest struct {
	Permanent bool   `json:"permanent"`
	UntilUnix int64  `json:"until_unix"`
	Reason    string `json:"reason"`
}

type AssignRolesRequest struct {
	Roles []Role `json:"roles"`
}
type AssignPermissionsRequest struct {
	Permissions []string `json:"permissions"`
}
type AssignRestrictionsRequest struct {
	Restrictions []string `json:"restrictions"`
}

type UpdateGlobalSettingRequest struct {
	Value map[string]any `json:"value"`
}

type UserActionItem struct {
	ID         int64          `json:"id"`
	Action     string         `json:"action"`
	TargetType string         `json:"target_type"`
	TargetID   string         `json:"target_id"`
	Metadata   map[string]any `json:"metadata"`
	CreatedAt  int64          `json:"created_at"`
}
