package domain

type MeResponse struct {
	User    User    `json:"user"`
	Session Session `json:"session"`
}
