# Visual Direction + Design System Specification
## Football Tournament Mobile-First Web App (Dark Premium System)

## 0) Scope
- Этот документ задает **визуальную систему, правила дизайна и компонентную логику**.
- React/UI-код не включается.
- Основание: ранее утвержденные Product+UX Foundation и IA/Routing.
- Применяется ко всем public и account экранам в единой dark-only системе.

---

## 1) Общее визуальное направление

## 1.1 Brand mood
Интерфейс должен ощущаться как:
- дорого,
- минималистично,
- строго,
- современно,
- спортивно,
- темно,
- премиально.

## 1.2 Core visual language
1. **Only dark theme** (без light mode).
2. Почти черный фон + графитовые поверхности.
3. Белая/светло-серая типографика с четкой иерархией.
4. Тонкие желтые линии как структурный акцент.
5. Геометричная сетка, строгие радиусы, минимум визуального шума.
6. Высокий контраст по смысловым уровням, а не по “кричащим” цветам.

## 1.3 Запреты (hard constraints)
- Нельзя light theme.
- Нельзя кислотные цвета.
- Нельзя яркий “gold luxury”.
- Нельзя glassmorphism.
- Нельзя heavy gradients.
- Нельзя случайные декоративные dribbble-элементы.
- Нельзя generic dashboard-aesthetic со случайной инфографикой.

## 1.4 Visual discipline rules
- Каждый экран строится из 2–4 крупных смысловых блоков.
- Каждый блок имеет четкую роль: primary / secondary / tertiary.
- Декор допускается только если усиливает структуру и навигацию.
- Любой акцентный цвет должен объяснять действие/статус, а не “украшать”.

---

## 2) Design Tokens

## 2.1 Color tokens

### Base surfaces
- `color.bg.app = #0A0B0D` (почти черный, глобальный фон)
- `color.bg.surface = #111317` (базовые карточки/панели)
- `color.bg.surfaceElevated = #171A1F` (приподнятые поверхности: модалки, sticky-controls)

### Borders
- `color.border.subtle = #232730` (разделители, таблицы)
- `color.border.strong = #343A46` (активные/важные контейнеры)

### Typography
- `color.text.primary = #F5F7FA`
- `color.text.secondary = #C5CBD5`
- `color.text.muted = #8A93A3`

### Accent
- `color.accent.yellow = #E8C547` (основной бренд-акцент)
- `color.accent.yellowSoft = rgba(232, 197, 71, 0.18)` (фоновые подложки/подсветки)

### Status
- `color.status.live = #FF5A36` (live/critical game pulse)
- `color.status.success = #4FBF77` (win/success)
- `color.status.warning = #E8C547` (attention/neutral warning)
- `color.status.error = #E05A5A` (error/failure)
- `color.status.info = #5E86FF` (secondary info)

**Правило live-state:** live-индикация всегда сопровождается не только цветом, но и текстом `LIVE`/иконкой точки.

## 2.2 Radius scale
- `radius.xs = 6`
- `radius.sm = 10`
- `radius.md = 14`
- `radius.lg = 18`
- `radius.xl = 24`

**Usage:**
- small controls: xs/sm,
- cards: md,
- hero/featured blocks: lg,
- full-width highlight panels: lg/xl.

## 2.3 Spacing scale (4-pt system)
- `space.1 = 4`
- `space.2 = 8`
- `space.3 = 12`
- `space.4 = 16`
- `space.5 = 20`
- `space.6 = 24`
- `space.7 = 28`
- `space.8 = 32`
- `space.10 = 40`
- `space.12 = 48`

**Rhythm:**
- block-to-block: 20–24,
- section-to-section: 24–32,
- card internal padding: 12–16,
- hero internal padding: 20–24.

## 2.4 Typography scale (system)
- `type.h1 = 32/36, 700, -0.01em`
- `type.h2 = 24/30, 700, -0.01em`
- `type.h3 = 20/26, 600, 0`
- `type.sectionTitle = 16/22, 600, 0.01em`
- `type.body = 15/22, 400, 0`
- `type.caption = 13/18, 500, 0.01em`
- `type.meta = 12/16, 500, 0.02em, uppercase optional`

## 2.5 Line thickness rules
- Structural yellow lines: `1px` (mobile), `1.25px` optical on desktop if needed.
- Standard dividers: `1px` subtle border.
- Heavy lines (>2px) запрещены, кроме progress indicators.

## 2.6 Shadow rules
- По умолчанию тени минимальны в dark UI.
- `shadow.surface = 0 2px 8px rgba(0,0,0,0.25)`
- `shadow.elevated = 0 8px 24px rgba(0,0,0,0.35)`

**Запрет:** не использовать glow/colored shadow как декоративный шум.

## 2.7 Focus / Hover / Pressed
- Focus ring: `1.5px solid color.accent.yellow` + `2px` outer dark gap.
- Hover (desktop): surface lightening на +4–6% luminance.
- Pressed: surface darkening на -4–6% + slight scale `0.99` для кнопок.
- Disabled: opacity 0.45 + muted text.

---

## 3) Типографика (прикладные правила)

## 3.1 H1 / H2 / H3 usage
- `H1` только для top hero заголовков Home/Match Details.
- `H2` для экранных заголовков и ключевых секций.
- `H3` для карточных подзаголовков и внутренних блоков.

## 3.2 Section title
- Всегда с высоким контрастом.
- Может сопровождаться тонкой желтой линией слева (8–16px длина).

## 3.3 Body / Caption / Meta
- Body: основной текст описаний и лейблов.
- Caption: вторичные подписи под статистикой.
- Meta: статусы, тур/дата, служебные ярлыки.

## 3.4 Numeric typography (scoreboard)
- Score digits: `type.h1` или специальный `score.2xl = 40/42, 700` на Match Details.
- Между счетом и командами всегда достаточный воздух (минимум 12px).
- Нельзя использовать узкие декоративные цифры; приоритет — читаемость.

## 3.5 Standings typography
- Rank: 14/20, 600
- Team name: 14/20, 500
- Numeric cols (P, W, D, L, GD, Pts): 13/18, 600, tabular numerals.
- Points column визуально сильнее остальных (цвет `text.primary` + weight 700).

## 3.6 Displaying score
Формат отображения:
- Live/finished: `2 : 1`
- Upcoming: `— : —` + kickoff time.
- Penalty info: `1 : 1 (4 : 3 pen)` в secondary line.

## 3.7 Goal difference as superscript
Для таблицы:
- Основной формат: `+12`
- В compact mode допустим superscript presentation рядом с очками: `45 ^+12`
- Superscript стиль: `10/12, 600, text.secondary`, baseline-shift +2px.

---

## 4) Component Rules

## 4.1 AppHeader
**Назначение:** стабильный контекст и глобальная ориентация.

**Визуальная структура:**
- Left slot / Title / Right slot.
- Нижняя разделительная subtle-линия.

**Spacing:**
- Horizontal 16.
- Height 56 + safe-area top.

**Hierarchy:**
- Title всегда primary.
- Left/right actions secondary.

**States:** default, scrolled (с более явной границей), with-back, with-search-action.

**Mobile:** fixed, компактный.
**Desktop:** fixed, max-width container alignment.

## 4.2 BackButton
**Назначение:** возврат по иерархии/истории.

**Визуальная структура:**
- Иконка стрелки + опционально label “Back”.

**Spacing:**
- Touch area 44x44.

**States:** default/hover/pressed/focus/disabled.

**Mobile:** icon-only предпочтительно.
**Desktop:** допускается icon+text.

## 4.3 BottomNav
**Назначение:** primary navigation между L1 разделами.

**Структура:**
- 5 пунктов: icon + label.
- Верхняя граница `border.subtle`.

**Spacing:**
- Height 64 + safe-area bottom.
- Item padding 8–10.

**Hierarchy:**
- Active item: text.primary + yellow indicator line (top or under-icon).
- Inactive: text.muted.

**States:** inactive/active/pressed/focus.

**Mobile:** always fixed.
**Desktop:** может оставаться fixed снизу или переходить в compact dock в зависимости от layout.

## 4.4 HeroBlock
**Назначение:** главный фокус экрана.

**Структура:**
- Title, secondary meta, primary CTA/links.
- Тонкая желтая линия как framing edge (не более 1 стороны по умолчанию).

**Spacing:** 20–24 internal.

**Hierarchy:**
- Один главный факт (например ключевой матч/статус).

**States:** default/live/highlight.

**Mobile:** full width.
**Desktop:** constrained width + companion panel.

## 4.5 SectionHeader
**Назначение:** маркировать секции и задать ритм.

**Структура:** title + action (“See all”).

**Spacing:** top margin 24, bottom 12.

**States:** default/with-action.

**Mobile:** action text compact.
**Desktop:** action может быть button-link.

## 4.6 MatchCard
**Назначение:** быстрый обзор матча в списке.

**Структура:**
- Meta row (тур/время/статус),
- Team A row,
- Team B row,
- Score/status zone.

**Spacing:** 14–16 padding, row gaps 8.

**Hierarchy:**
- Teams + score primary,
- meta secondary,
- badges tertiary.

**States:** upcoming/live/finished/pressed.

**Mobile:** full-width stacked list.
**Desktop:** grid/list hybrid.

## 4.7 Scoreboard
**Назначение:** центральная визуальная единица Match Details.

**Структура:**
- Team A — Score — Team B
- Secondary: status + time + stage.

**Spacing:** vertical 16–20.

**Hierarchy:**
- Score strongest,
- team names second,
- meta third.

**States:** pre-match/live/half-time/finished/penalties.

**Mobile:** single-column with centered score.
**Desktop:** expanded horizontal layout.

## 4.8 TeamCard
**Назначение:** обзор команды в гриде/списке.

**Структура:** crest, team name, short meta (position/form).

**Spacing:** 12–16.

**Hierarchy:** name > crest > meta.

**States:** default/selected/pressed.

**Mobile:** 1–2 columns.
**Desktop:** 3–5 columns.

## 4.9 TeamRow
**Назначение:** компактный линейный элемент (table/list).

**Структура:** rank(optional), crest, name, small stats.

**Spacing:** row height 48–56.

**States:** default/highlighted (favorite)/pressed.

**Mobile:** сокращенные поля.
**Desktop:** расширенные колонки.

## 4.10 PlayerCard / PlayerRow
**Назначение:** представление игрока в detail/list context.

**Структура:** avatar, name, position, team, small stat.

**Spacing:** card 12–16; row height 52.

**States:** default/pressed/injured(optional status badge).

**Mobile:** row-first.
**Desktop:** card/table optional switch.

## 4.11 StandingsTable
**Назначение:** турнирная таблица.

**Структура:** sticky header + team rows.

**Spacing:**
- Header row 40–44,
- Data row 44–52.

**Hierarchy:**
- Rank, team, points приоритетные.
- Secondary stats приглушенные.

**States:** group switch, sorted, row hover/focus.

**Mobile:** compact cols + optional horizontal scroll.
**Desktop:** full columns.

## 4.12 BracketView
**Назначение:** визуализация пути стадий.

**Структура:** раундовые колонки + матч-карточки + connector lines.

**Spacing:**
- Round column gap 20–24,
- Match gap 12–16.

**Hierarchy:**
- Раундовая структура первична,
- Матч данные вторичны.

**States:** round-focused/current-round/live-match.

**Mobile:** horizontal scroll + snap.
**Desktop:** multi-round on screen.

## 4.13 StatusBadge
**Назначение:** статус матча/сущности.

**Структура:** capsule label + optional dot.

**Spacing:** px 8–10 / py 4–6.

**States:** live/upcoming/finished/warning/error.

**Mobile/Desktop:** одинаковая визуальная модель.

## 4.14 SearchField
**Назначение:** глобальный и локальный поиск.

**Структура:** leading icon, input, trailing clear/action.

**Spacing:** height 44–48.

**States:** idle/focus/typing/loading/has-results/no-results.

**Mobile:** автофокус на /search.
**Desktop:** wider input + keyboard hints.

## 4.15 FilterTabs / SegmentedControl
**Назначение:** быстрые фильтры категорий/статусов.

**Структура:** horizontal chips/segments.

**Spacing:** chip height 32–36, gap 8.

**States:** default/active/pressed/disabled.

**Mobile:** horizontal scrollable row.
**Desktop:** wrap or inline row.

## 4.16 EmptyState
**Назначение:** понятная реакция на пустые результаты.

**Структура:** icon/illustration minimal + title + guidance + CTA.

**Spacing:** 24–32 vertical.

**States:** no-data/no-results/error-lite.

**Mobile/Desktop:** центрированный блок, не занимать >40% экрана визуальным шумом.

## 4.17 PageContainer
**Назначение:** стандартизировать ширину/отступы/ритм.

**Структура:** max-width container + responsive paddings.

**Spacing:**
- Mobile horizontal 16,
- Tablet 20,
- Desktop 24–32 + max width.

**States:** default/with-sticky-subheader.

**Mobile:** single-column.
**Desktop:** optional split-layout.

---

## 5) Система тонких желтых линий (critical visual grammar)

## 5.1 Основной принцип
Желтая линия = **структурный маркер иерархии**, а не декоративный орнамент.

## 5.2 Глобальные правила
- Толщина: 1px.
- Цвет: `accent.yellow` (иногда 80% opacity для secondary).
- Максимум 1–2 акцентные линии на крупный блок.
- Нельзя использовать линии на каждом элементе списка.
- Линии не должны замещать типографическую иерархию.

## 5.3 Hero blocks
- Линия размещается по левому краю или сверху.
- Длина: 24–64 px (не на всю ширину блока по умолчанию).
- Назначение: подчеркнуть “featured” статус.

## 5.4 Match cards
- Линия используется только для live/featured матча.
- Позиция: верхняя внутренняя грань или короткий левый маркер.

## 5.5 Scoreboard
- Допустима тонкая разделительная линия между main score и meta.
- В live-состоянии возможен короткий yellow underline под статусом.

## 5.6 Bracket
- Connector lines между матчами — нейтральные (border.subtle).
- Yellow используется только для текущего выбранного пути/раунда.

## 5.7 Section separators
- Между крупными секциями допустимы короткие yellow separators как rhythm anchors.
- Не чаще одного separator на 2 секции.

## 5.8 Active states
- Active tab/button может иметь yellow underline/edge.
- Запрещен сплошной yellow fill для крупных интерактивных поверхностей.

## 5.9 Decorative structural framing
- Тонкие угловые corner-lines допустимы в Hero/Scoreboard.
- Максимум 2 угла на блок, без “техно-схемы”.

---

## 6) Визуальная композиция ключевых экранов

## 6.1 Home
**Визуальный центр:** Featured Match Hero.

**Крупные блоки:**
1. Hero (самый крупный)
2. “Today / Next Matches”
3. Mini-table + quick links

**Вторичные:** новости/инсайты (если есть)

**Пустоты и ритм:**
- После Hero — 24px воздушный разрыв.
- Между list-блоками — 20px.
- Не более 3 карточек “above fold”, чтобы не перегружать.

**Как избежать дешевого skeleton UI:**
- Использовать meaningful placeholders (score/date/team stubs),
- сохранять реальные пропорции карточек,
- не показывать одинаковые серые “кирпичи” без структурных якорей.

## 6.2 Matches
**Визуальный центр:** список матчей текущего фильтра.

**Крупные блоки:**
1. Sticky filter tabs
2. Match list

**Вторичные:** compact calendar/round switch

**Пустоты:**
- Плотный list-rhythm (12–16 между карточками).
- Контролы отделяются от списка 12px.

**Анти-дешевый эффект:**
- Четкая дифференциация live/upcoming/finished через статус+типографику, не только цвет.

## 6.3 Match Details
**Визуальный центр:** Scoreboard hero.

**Крупные блоки:**
1. Scoreboard
2. Timeline/events
3. Lineups/key players

**Вторичные:** ссылки в Table/Team details

**Пустоты:**
- После scoreboard 24px.
- Между деталями событий 16px.

**Анти-skeleton правила:**
- Скелетон с явно размеченными зонами (team crest zone, score zone, event rows),
- instant reveal для score/status, deferred reveal для secondary stats.

## 6.4 Standings
**Визуальный центр:** таблица позиций.

**Крупные блоки:**
1. Group/stage selector
2. Standings table

**Вторичные:** explanatory legend + link to bracket

**Пустоты:**
- Контролы 12px над таблицей,
- после таблицы 20px до secondary info.

**Анти-дешевый эффект:**
- Типографический контраст колонок,
- фиксированные числовые ширины,
- выделение points column без лишнего цвета.

## 6.5 Bracket
**Визуальный центр:** текущий раунд + его связи.

**Крупные блоки:**
1. Round control strip (sticky)
2. Horizontal bracket canvas

**Вторичные:** match detail preview (optional)

**Пустоты:**
- Между round strip и canvas — 12px.
- Между колонками 20–24px.

**Анти-дешевый эффект:**
- Ровная геометрия матч-карточек,
- аккуратные connector lines,
- ограниченное количество yellow-highlight только на текущем фокусе.

---

## 7) QA Checklist для визуальной консистентности

Перед запуском UI в разработку каждый экран проверяется по чеклисту:
1. Dark-only соблюден.
2. Контраст текста соответствует уровням primary/secondary/muted.
3. Желтые линии не хаотичны и не превышают лимит акцентов.
4. Ритм отступов соответствует token scale.
5. Header + BottomNav визуально стабильны.
6. Back/navigation states читаемы.
7. Live/status не зависят только от цвета.
8. Mobile-first композиция читаема на 360px.
9. Desktop не выглядит растянутой мобильной версией.

---

## 8) Deliverable Format
- Этот документ является **design system spec + visual direction**.
- Применяется как source of truth перед UI-реализацией.
- Любые отклонения фиксируются через дизайн-ревью и changelog токенов.
