package domain

import "time"

type TelegramAuthStartResponse struct {
	State   string    `json:"state"`
	AuthURL string    `json:"auth_url"`
	Expires time.Time `json:"expires_at"`
}

type TelegramAuthCompleteRequest struct {
	State    string `json:"state"`
	InitData string `json:"init_data"`
}

type TelegramIdentity struct {
	TelegramID int64
	Username   string
	FirstName  string
	LastName   string
}
