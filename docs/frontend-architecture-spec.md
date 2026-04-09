# Frontend Architecture Specification
## React + TypeScript + Vite + Tailwind + React Router

## 0) Scope
- Документ фиксирует **архитектуру frontend проекта** без полной реализации.
- Основан на утвержденных Product/IA/Design/Domain спецификациях.
- Цель: дать команде готовый каркас для быстрой реализации P0 экранов.

---

## 1) Stack

## 1.1 Required
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

## 1.2 Allowed (justified)
- `clsx` — условные className без лишней сложности.
- `lucide-react` — консистентные иконки для shell/navigation/status.
- `react-hook-form` — только для Login/Profile форм.
- Lightweight state (`Context` + local hooks) — для session, ui prefs, cache/meta state.

## 1.3 Deliberate exclusions (на старте)
- Нет тяжелого глобального state manager (Redux/Zustand) до явной необходимости.
- Нет query-клиента (React Query) на phase-1 с моками; abstraction закладывается через repositories + hooks.

---

## 2) Folder Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── main.tsx
│   ├── providers/
│   │   ├── router-provider.tsx
│   │   ├── session-provider.tsx
│   │   └── ui-provider.tsx
│   ├── router/
│   │   ├── route-paths.ts
│   │   ├── route-config.tsx
│   │   └── guards.ts
│   └── styles/
│       ├── globals.css
│       └── tailwind.css
│
├── layouts/
│   ├── public-shell/
│   │   ├── PublicShell.tsx
│   │   ├── PublicHeader.tsx
│   │   ├── BottomNav.tsx
│   │   └── shell.constants.ts
│   └── containers/
│       ├── PageContainer.tsx
│       └── ContentScrollArea.tsx
│
├── pages/
│   ├── home/
│   │   └── HomePage.tsx
│   ├── matches/
│   │   ├── MatchesPage.tsx
│   │   └── MatchDetailsPage.tsx
│   ├── teams/
│   │   ├── TeamsPage.tsx
│   │   └── TeamDetailsPage.tsx
│   ├── players/
│   │   ├── PlayersPage.tsx
│   │   └── PlayerDetailsPage.tsx
│   ├── table/
│   │   └── TablePage.tsx
│   ├── bracket/
│   │   └── BracketPage.tsx
│   ├── search/
│   │   └── SearchPage.tsx
│   ├── login/
│   │   └── LoginPage.tsx
│   └── profile/
│       └── ProfilePage.tsx
│
├── features/
│   ├── matches/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── mappers/
│   │   └── model/
│   ├── teams/
│   ├── players/
│   ├── standings/
│   ├── bracket/
│   ├── search/
│   ├── auth/
│   └── navigation/
│
├── components/
│   ├── ui/
│   │   ├── button/
│   │   ├── card/
│   │   ├── badge/
│   │   ├── input/
│   │   ├── tabs/
│   │   └── empty-state/
│   ├── data-display/
│   │   ├── scoreboard/
│   │   ├── status-badge/
│   │   ├── standings-table/
│   │   └── bracket-view/
│   └── feedback/
│       ├── skeletons/
│       └── error-block/
│
├── domain/
│   ├── entities/
│   │   ├── tournament.ts
│   │   ├── team.ts
│   │   ├── player.ts
│   │   ├── match.ts
│   │   ├── standings.ts
│   │   ├── bracket.ts
│   │   ├── search.ts
│   │   └── session.ts
│   ├── repositories/
│   │   ├── teams-repository.ts
│   │   ├── players-repository.ts
│   │   ├── matches-repository.ts
│   │   ├── standings-repository.ts
│   │   ├── bracket-repository.ts
│   │   └── search-repository.ts
│   └── services/
│       ├── logo-resolver.ts
│       └── standings-calculator.ts
│
├── hooks/
│   ├── app/
│   │   ├── useSession.ts
│   │   ├── useBackNavigation.ts
│   │   └── useShellMeta.ts
│   ├── data/
│   │   ├── useTeams.ts
│   │   ├── useTeamDetails.ts
│   │   ├── usePlayers.ts
│   │   ├── usePlayerDetails.ts
│   │   ├── useMatches.ts
│   │   ├── useMatchDetails.ts
│   │   ├── useStandings.ts
│   │   ├── useBracket.ts
│   │   └── useSearch.ts
│   └── ui/
│       ├── useStickyOffset.ts
│       ├── useSafeAreaInsets.ts
│       └── useScrollRestore.ts
│
├── lib/
│   ├── router/
│   │   ├── route-helpers.ts
│   │   └── back-fallback.ts
│   ├── http/
│   │   ├── api-client.ts
│   │   └── adapters/
│   ├── utils/
│   │   ├── dates.ts
│   │   ├── formatters.ts
│   │   ├── guards.ts
│   │   └── result.ts
│   └── constants/
│       ├── ui.ts
│       └── routes.ts
│
├── mocks/
│   ├── data/
│   │   ├── tournament.json
│   │   ├── teams.json
│   │   ├── players.json
│   │   ├── matches.json
│   │   ├── standings.json
│   │   └── bracket.json
│   ├── repositories/
│   │   ├── mock-teams-repository.ts
│   │   ├── mock-players-repository.ts
│   │   ├── mock-matches-repository.ts
│   │   ├── mock-standings-repository.ts
│   │   ├── mock-bracket-repository.ts
│   │   └── mock-search-repository.ts
│   └── fixtures/
│       └── scenarios.ts
│
└── assets/
    ├── logos/
    ├── icons/
    └── images/
```

---

## 3) Layer Responsibilities

## 3.1 `app/`
- Bootstrap приложения, провайдеры, router wiring, глобальные стили.
- Здесь **нет feature-логики** и бизнес-правил.

## 3.2 `layouts/`
- Композиция shell и глобальных layout primitives.
- `PublicShell` знает про header/bottom nav/safe-area, но не знает детали домена.

## 3.3 `pages/`
- Route-level orchestration.
- Подключают hooks, собирают feature blocks, управляют page-level loading/empty/error.
- Не содержат сложной бизнес-логики.

## 3.4 `features/`
- Feature-specific блоки и поведение (match list, team roster, bracket stage control).
- Внутри `features/*/hooks` — мелкие hook-оркестраторы только для данной feature.

## 3.5 `components/`
- Shared UI-kit + reusable data-display компоненты.
- Не должны импортировать pages.
- Минимум knowledge о конкретном роуте.

## 3.6 `domain/`
- Source-of-truth для типов сущностей, интерфейсов репозиториев и доменных сервисов.
- Нет React зависимостей.

## 3.7 `hooks/`
- Cross-feature reusable hooks (app/data/ui).
- Data hooks зависят от repository interfaces, а не от конкретного mock impl.

## 3.8 `lib/`
- Технические утилиты, helpers, route helper, api adapter layer.
- Не хранит бизнес-данные.

## 3.9 `mocks/`
- JSON datasets + mock repository реализации + сценарии.
- Single place для mock truth; pages/feature не читают JSON напрямую.

## 3.10 `assets/`
- Статические ресурсы: логотипы, иконки, изображения.

---

## 4) Shared UI vs Feature-level split

## 4.1 Shared UI (`src/components/ui`)
Использовать для атомарных/базовых примитивов:
- Button
- Input
- Badge
- Tabs/SegmentedControl
- Card
- EmptyState

## 4.2 Shared data-display (`src/components/data-display`)
Использовать для нейтральных доменно-ориентированных визуализаций:
- Scoreboard
- StatusBadge
- StandingsTable
- BracketView

## 4.3 Feature-level (`src/features/*/components`)
Использовать для блоков, завязанных на конкретные сценарии:
- MatchListSection
- TeamFormStrip
- PlayerStatsPanel
- BracketRoundSwitcher
- SearchGroupedResults

**Правило:** если компонент нужен в 2+ независимых features и не тянет feature-specific logic — переносить в `components/`.

---

## 5) Route Config Placement

- `src/app/router/route-paths.ts` — константы всех путей (`/`, `/matches/:id`, ...).
- `src/app/router/route-config.tsx` — декларативное дерево роутов + layouts.
- `src/app/router/guards.ts` — route guards (например profile requires auth).

### Recommended route composition
- Root route рендерит `PublicShell`.
- Вложенные route pages рендерятся в `Outlet` внутри content area.
- 404/NotFound можно рендерить внутри shell для сохранения целостности.

---

## 6) App Shell Architecture

## 6.1 PublicShell responsibilities
- Держит постоянный `Header` + `BottomNav` + `ContentScrollArea`.
- Определяет активный tab по route.
- Умеет читать shell meta (title, showBack, rightAction).

## 6.2 Header logic
- Левый слот: BackButton или brand.
- Центр: title текущей страницы.
- Правый слот: контекстное действие (например search shortcut).
- Sticky всегда.

## 6.3 BottomNav logic
- Показывает L1 маршруты: Home/Matches/Teams/Table/Search.
- Active-state определяется группой route.
- Повторный клик по активному пункту → scroll-to-top.

## 6.4 Back button logic
- Hook `useBackNavigation`:
  1. если есть history внутри SPA — `navigate(-1)`;
  2. иначе fallback mapping:
     - `/matches/:id` → `/matches`
     - `/teams/:id` → `/teams`
     - `/players/:id` → `/players`
     - `/bracket` → `/table`
     - `/search`, `/login`, `/profile` → `/`

## 6.5 Layout container logic
- `PageContainer` задает max width + горизонтальные paddings.
- `ContentScrollArea` учитывает высоту fixed header + bottom nav.
- Page sections следуют spacing rhythm из design tokens.

## 6.6 Safe area support
- CSS vars/utility classes для `env(safe-area-inset-top/bottom)`.
- Bottom nav height = base height + safe area bottom.
- Header top padding учитывает safe area top.

---

## 7) Data Flow Architecture

## 7.1 Repository-first data access
Flow:
1. Page вызывает data hook.
2. Hook вызывает repository interface method.
3. Repository (mock impl) читает data + применяет фильтры/сортировку.
4. Hook отдает в page state: `{data, isLoading, isEmpty, error, refetch}`.

## 7.2 Hook contract pattern
Все data hooks возвращают единый shape:

```ts
type QueryState<T> = {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};
```

## 7.3 Mapping layer
- `features/*/mappers` преобразуют domain entities в view model.
- Pages/Components не должны вычислять сложные derived fields напрямую.
- Примеры: format match subtitle, build standings compact row, group search results.

## 7.4 Repository injection strategy
- В `app/providers` создается `RepositoriesContext`.
- На dev/start подставляются mock repositories.
- Позже подмена на API repositories без изменения pages/hooks контрактов.

## 7.5 API migration path (later)
1. Создать `src/lib/http/api-client.ts`.
2. Добавить `src/domain/repositories/*` API реализации.
3. Сохранить те же интерфейсы methods/return types.
4. Заменить provider wiring mock → api.
5. UI и hooks остаются неизменными (кроме edge tuning).

---

## 8) Hooks Strategy

## 8.1 App hooks
- `useSession` — auth/session state.
- `useShellMeta` — title/back/action конфигурация текущей страницы.
- `useBackNavigation` — единая back fallback логика.

## 8.2 Data hooks
- `useTeams`, `useTeamDetails`
- `usePlayers`, `usePlayerDetails`
- `useMatches`, `useMatchDetails`
- `useStandings`
- `useBracket`
- `useSearch`

**Rules:**
- Hooks не импортируют JSON напрямую.
- Hooks не знают о Router paths hardcoded (кроме `useSearch` route generation helpers).

## 8.3 UI hooks
- `useSafeAreaInsets`
- `useStickyOffset`
- `useScrollRestore`

---

## 9) Repository Strategy

## 9.1 Interface location
- Только в `src/domain/repositories/*.ts`.
- Это контракт между UI/hooks и data source.

## 9.2 Implementations
- `src/mocks/repositories/*` — текущая реализация.
- `src/domain/repositories/api/*` (later) — backend реализация.

## 9.3 Repository responsibilities
- Read operations, filtering, sorting, lightweight shaping.
- Enforce consistency checks for mocks when feasible.

## 9.4 Non-responsibilities
- Не рендерят view models под конкретный компонент.
- Не управляют UI-state (loading spinners, toasts).

---

## 10) Page Layer Architecture

## 10.1 Route pages (container pages)
- `HomePage`
- `MatchesPage`
- `MatchDetailsPage`
- `TeamsPage`
- `TeamDetailsPage`
- `PlayersPage`
- `PlayerDetailsPage`
- `TablePage`
- `BracketPage`
- `SearchPage`
- `LoginPage`
- `ProfilePage`

## 10.2 What pages do
- Определяют page sections.
- Подключают 1..N hooks.
- Передают данные в feature/shared components.
- Управляют состояниями loading/empty/error/retry на уровне страницы.

## 10.3 What pages do NOT do
- Не делают сложных доменных расчетов.
- Не хранят reusable UI tokens/константы.
- Не завязываются на конкретный source (mock/api).

## 10.4 Feature blocks by page (пример)
- HomePage:
  - `features/matches/components/FeaturedMatchHero`
  - `features/matches/components/TodayMatchesList`
  - `features/standings/components/MiniTable`
- MatchDetailsPage:
  - `components/data-display/Scoreboard`
  - `features/matches/components/MatchTimeline`
  - `features/teams/components/RelatedTeamsLinks`
- TablePage:
  - `components/data-display/StandingsTable`
  - `features/standings/components/GroupSwitcher`
- BracketPage:
  - `components/data-display/BracketView`
  - `features/bracket/components/RoundControls`

---

## 11) Responsibility Split Summary

- **Domain:** types + repository contracts + pure services.
- **Mocks:** data + repository implementations for local dev.
- **Hooks:** data fetching orchestration + state shape.
- **Features:** scenario-level UI/logic blocks.
- **Components:** reusable visual primitives and displays.
- **Pages:** route orchestration and state composition.
- **Layouts:** persistent shell and container logic.
- **App:** wiring providers/router/bootstrap.

---

## 12) Implementation Readiness Checklist

Архитектура считается готовой к старту реализации, если:
1. Route config подключен к `PublicShell`.
2. Repository interfaces определены и mock implementations доступны.
3. Минимальный набор data hooks создан с единым query-state контрактом.
4. PageContainer + safe-area utilities подключены.
5. P0 route pages созданы как контейнеры.
6. Feature blocks разделены от shared components.

---

## 13) Deliverable
- Этот документ — архитектурная спецификация frontend слоя.
- Используется как guide для поэтапной реализации без переписывания структуры на этапе интеграции API.
