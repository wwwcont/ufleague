package domain

type DevLoginRequest struct {
	Username     string   `json:"username"`
	DisplayName  string   `json:"display_name"`
	Roles        []Role   `json:"roles"`
	Permissions  []string `json:"permissions"`
	Restrictions []string `json:"restrictions"`
}

type MeResponse struct {
	User    User    `json:"user"`
	Session Session `json:"session"`
}
