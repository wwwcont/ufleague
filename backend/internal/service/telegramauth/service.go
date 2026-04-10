package telegramauth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/platform/telegram"
	"football_ui/backend/internal/repository"
)

type Service struct {
	authRepo     *repository.AuthRepository
	validator    telegram.InitDataValidator
	baseAuthURL  string
	challengeTTL time.Duration
}

func NewService(authRepo *repository.AuthRepository, validator telegram.InitDataValidator, baseAuthURL string) Service {
	return Service{authRepo: authRepo, validator: validator, baseAuthURL: baseAuthURL, challengeTTL: 10 * time.Minute}
}

func (s Service) Start(ctx context.Context) (domain.TelegramAuthStartResponse, error) {
	state, err := randomHex(16)
	if err != nil {
		return domain.TelegramAuthStartResponse{}, err
	}
	nonce, err := randomHex(12)
	if err != nil {
		return domain.TelegramAuthStartResponse{}, err
	}
	expires := time.Now().UTC().Add(s.challengeTTL)
	if err = s.authRepo.CreateTelegramChallenge(ctx, state, nonce, expires); err != nil {
		return domain.TelegramAuthStartResponse{}, err
	}
	return domain.TelegramAuthStartResponse{State: state, AuthURL: fmt.Sprintf("%s?state=%s", s.baseAuthURL, state), Expires: expires}, nil
}

func (s Service) Complete(ctx context.Context, req domain.TelegramAuthCompleteRequest) (domain.User, error) {
	if err := s.authRepo.ConsumeTelegramChallenge(ctx, req.State); err != nil {
		return domain.User{}, err
	}
	identity, err := s.validator.Validate(ctx, req.InitData)
	if err != nil {
		return domain.User{}, err
	}
	return s.authRepo.UpsertTelegramUser(ctx, identity)
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
