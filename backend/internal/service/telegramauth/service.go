package telegramauth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/url"
	"strings"
	"time"

	"football_ui/backend/internal/domain"
	"football_ui/backend/internal/repository"
)

var (
	ErrInvalidCode    = errors.New("invalid telegram login code")
	ErrExpiredCode    = errors.New("expired telegram login code")
	ErrSessionExpired = errors.New("telegram login session expired")
)

type Service struct {
	authRepo     *repository.AuthRepository
	baseBotURL   string
	sessionTTL   time.Duration
	codeTTL      time.Duration
	mockEnabled  bool
	mockCode     string
	defaultRoles []domain.Role
}

func NewService(authRepo *repository.AuthRepository, baseBotURL string, mockEnabled bool, mockCode string) Service {
	return Service{
		authRepo:     authRepo,
		baseBotURL:   baseBotURL,
		sessionTTL:   10 * time.Minute,
		codeTTL:      30 * time.Minute,
		mockEnabled:  mockEnabled,
		mockCode:     strings.TrimSpace(mockCode),
		defaultRoles: []domain.Role{domain.RolePlayer, domain.RoleCaptain, domain.RoleAdmin, domain.RoleSuperadmin},
	}
}

func (s Service) IssueCode(ctx context.Context, req domain.TelegramIssueCodeRequest) (domain.TelegramIssueCodeResponse, error) {
	req.RequestID = strings.TrimSpace(req.RequestID)
	if req.RequestID == "" || req.TelegramUserID == 0 {
		return domain.TelegramIssueCodeResponse{}, ErrInvalidCode
	}
	active, err := s.authRepo.IsTelegramLoginSessionActive(ctx, req.RequestID)
	if err != nil {
		return domain.TelegramIssueCodeResponse{}, err
	}
	if !active {
		return domain.TelegramIssueCodeResponse{}, ErrSessionExpired
	}
	role := domain.RoleGuest
	if req.Role != nil {
		role = *req.Role
	}
	code, err := randomDigits(4)
	if err != nil {
		return domain.TelegramIssueCodeResponse{}, err
	}
	expiresAt := time.Now().UTC().Add(s.codeTTL)
	if err = s.authRepo.StoreTelegramLoginCode(ctx, domain.TelegramLoginCode{
		SessionID:        req.RequestID,
		CodeHash:         hashCode(code),
		TelegramUserID:   req.TelegramUserID,
		TelegramUsername: strings.TrimSpace(req.TelegramUsername),
		Role:             role,
		ExpiresAt:        expiresAt,
		IssuedBy:         "bot_adapter",
	}); err != nil {
		return domain.TelegramIssueCodeResponse{}, err
	}
	return domain.TelegramIssueCodeResponse{Code: code, ExpiresAt: expiresAt}, nil
}

func (s Service) Start(ctx context.Context, req domain.TelegramAuthStartRequest) (domain.TelegramAuthStartResponse, error) {
	requestID, err := randomHex(16)
	if err != nil {
		return domain.TelegramAuthStartResponse{}, err
	}
	expiresAt := time.Now().UTC().Add(s.sessionTTL)
	if err = s.authRepo.CreateTelegramLoginSession(ctx, requestID, expiresAt); err != nil {
		return domain.TelegramAuthStartResponse{}, err
	}

	role := domain.RoleGuest
	if req.Role != nil {
		role = *req.Role
	}
	if s.mockEnabled && s.mockCode != "" && isRoleAllowed(role) {
		mockIdentity := domain.TelegramIdentity{
			TelegramID: int64(9_000_000_000 + roleToInt(role)),
			Username:   fmt.Sprintf("mock_%s", role),
			FirstName:  "Mock",
			LastName:   string(role),
		}
		if err = s.authRepo.StoreTelegramLoginCode(ctx, domain.TelegramLoginCode{
			SessionID:        requestID,
			CodeHash:         hashCode(s.mockCode),
			TelegramUserID:   mockIdentity.TelegramID,
			TelegramUsername: mockIdentity.Username,
			Role:             role,
			ExpiresAt:        time.Now().UTC().Add(s.codeTTL),
			IssuedBy:         "mock_adapter",
		}); err != nil {
			return domain.TelegramAuthStartResponse{}, err
		}
	}

	return domain.TelegramAuthStartResponse{
		RequestID: requestID,
		AuthURL:   buildTelegramBotStartURL(s.baseBotURL, requestID),
		ExpiresAt: expiresAt,
	}, nil
}

func (s Service) CompleteCode(ctx context.Context, req domain.TelegramCodeLoginRequest) (domain.User, error) {
	req.RequestID = strings.TrimSpace(req.RequestID)
	req.Code = strings.TrimSpace(req.Code)
	if req.RequestID == "" || req.Code == "" {
		return domain.User{}, ErrInvalidCode
	}
	code, err := s.authRepo.ConsumeTelegramLoginCode(ctx, req.RequestID, hashCode(req.Code))
	if err != nil {
		return domain.User{}, ErrInvalidCode
	}
	if code.ExpiresAt.Before(time.Now().UTC()) {
		return domain.User{}, ErrExpiredCode
	}
	identity := domain.TelegramIdentity{
		TelegramID: code.TelegramUserID,
		Username:   code.TelegramUsername,
		FirstName:  "Telegram",
		LastName:   "User",
	}
	user, err := s.authRepo.UpsertTelegramUser(ctx, identity)
	if err != nil {
		return domain.User{}, err
	}
	if err = s.authRepo.ReplaceUserRoles(ctx, user.ID, []domain.Role{code.Role}); err != nil {
		return domain.User{}, err
	}
	return s.authRepo.GetUserByID(ctx, user.ID)
}

func hashCode(code string) []byte {
	sum := sha256.Sum256([]byte(code))
	return sum[:]
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func randomDigits(length int) (string, error) {
	if length <= 0 {
		return "", errors.New("invalid code length")
	}
	var b strings.Builder
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		b.WriteByte(byte('0' + n.Int64()))
	}
	return b.String(), nil
}

func buildTelegramBotStartURL(baseBotURL string, requestID string) string {
	trimmed := strings.TrimSpace(baseBotURL)
	if trimmed == "" {
		return fmt.Sprintf("https://t.me/ufleague_bot?start=login_%s", requestID)
	}
	if !strings.Contains(trimmed, "://") && !strings.HasPrefix(trimmed, "t.me/") {
		trimmed = fmt.Sprintf("https://t.me/%s", strings.TrimPrefix(trimmed, "@"))
	}
	if strings.HasPrefix(trimmed, "t.me/") {
		trimmed = "https://" + trimmed
	}
	parsed, err := url.Parse(trimmed)
	if err != nil {
		sep := "?"
		if strings.Contains(trimmed, "?") {
			sep = "&"
		}
		return fmt.Sprintf("%s%sstart=login_%s", trimmed, sep, requestID)
	}
	query := parsed.Query()
	query.Set("start", fmt.Sprintf("login_%s", requestID))
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func isRoleAllowed(role domain.Role) bool {
	switch role {
	case domain.RolePlayer, domain.RoleCaptain, domain.RoleAdmin, domain.RoleSuperadmin:
		return true
	default:
		return false
	}
}

func roleToInt(role domain.Role) int64 {
	switch role {
	case domain.RolePlayer:
		return 1
	case domain.RoleCaptain:
		return 2
	case domain.RoleAdmin:
		return 3
	case domain.RoleSuperadmin:
		return 4
	default:
		return 9
	}
}
