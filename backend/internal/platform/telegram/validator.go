package telegram

import (
	"context"
	"errors"

	"football_ui/backend/internal/domain"
)

type InitDataValidator interface {
	Validate(ctx context.Context, initData string) (domain.TelegramIdentity, error)
}

type StubValidator struct{}

func (StubValidator) Validate(_ context.Context, initData string) (domain.TelegramIdentity, error) {
	if initData == "" {
		return domain.TelegramIdentity{}, errors.New("empty init data")
	}
	return domain.TelegramIdentity{TelegramID: 1000001, Username: "tg_stub", FirstName: "Telegram", LastName: "User"}, nil
}
