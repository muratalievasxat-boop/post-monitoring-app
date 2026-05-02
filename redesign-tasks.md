# Полный редизайн Post-Monitoring App
## На основе макетов Claude Design (ветка main)

---

## ВАЖНО: Общий принцип

Мы НЕ удаляем существующую логику — только меняем внешний вид.
Все API-запросы, роли, фильтры, drill-down остаются.
Меняем: токены, CSS, JSX-разметку компонентов.

Перед каждой задачей Claude Code должен читать текущий файл и менять только то, что указано.

---

## TASK R0 — Дизайн-токены и шрифты (ФУНДАМЕНТ — делать ПЕРВЫМ)

**Branch:** `redesign/tokens`
**Сложность:** S (1 день)
**Зависимости:** нет

### Что сделать

#### 1. Обновить `frontend/index.html`

Убрать `@import` шрифта из CSS. Добавить в `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">
```

#### 2. Полностью переписать `:root` и `[data-theme="dark"]` в `frontend/src/styles.css`

**Светлая тема:**
```css
:root {
  /* Surfaces */
  --bg-page:     220 25% 97%;
  --bg-card:     0 0% 100%;
  --bg-elevated: 220 20% 96%;
  --bg-hover:    220 20% 93%;
  --bg-popover:  0 0% 100%;

  /* Borders */
  --border-hair:   220 15% 88%;
  --border-div:    220 15% 83%;
  --border-strong: 220 15% 72%;

  /* Text */
  --fg-headline:   222 40% 10%;
  --fg-body:       222 30% 18%;
  --fg-secondary:  222 20% 38%;
  --fg-meta:       222 15% 52%;
  --fg-dim:        222 12% 68%;

  /* Brand / accent */
  --accent:        199 89% 48%;
  --accent-2:      199 89% 40%;
  --accent-soft:   199 89% 48% / 0.10;
  --indigo:        239 84% 67%;

  /* Status */
  --status-done:     158 64% 38%;
  --status-done-soft:   158 64% 38% / 0.12;
  --status-active:   35 91% 48%;
  --status-active-soft: 35 91% 48% / 0.12;
  --status-excluded: 217 19% 55%;
  --status-excluded-soft: 217 19% 55% / 0.12;
  --status-overdue:  0 72% 51%;
  --status-overdue-soft: 0 72% 51% / 0.12;

  /* Typography */
  --font-sans: 'Inter Tight', -apple-system, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radii */
  --r-1: 4px;
  --r-2: 6px;
  --r-3: 10px;
  --r-4: 14px;

  /* Shadows */
  --shadow-sm: 0 1px 3px hsl(222 40% 10% / 0.06), 0 1px 0 hsl(222 40% 10% / 0.03);
  --shadow-md: 0 4px 16px hsl(222 40% 10% / 0.08);
  --shadow-pop: 0 12px 40px hsl(222 40% 10% / 0.14), 0 0 0 1px hsl(var(--border-div));

  /* Legacy aliases — оставить для backward compat */
  --background:        var(--bg-page);
  --card:              var(--bg-card);
  --foreground:        var(--fg-body);
  --muted:             var(--bg-elevated);
  --muted-foreground:  var(--fg-meta);
  --border:            var(--border-div);
  --primary:           var(--accent);
  --ring:              var(--accent);
  --input:             var(--bg-elevated);
}
```

**Тёмная тема:**
```css
[data-theme="dark"] {
  /* Surfaces */
  --bg-page:     222 47% 5%;
  --bg-card:     222 47% 8%;
  --bg-elevated: 222 47% 11%;
  --bg-hover:    222 47% 14%;
  --bg-popover:  222 47% 14%;

  /* Borders */
  --border-hair:   217 33% 14%;
  --border-div:    217 33% 19%;
  --border-strong: 217 33% 28%;

  /* Text */
  --fg-headline:   210 40% 96%;
  --fg-body:       215 30% 84%;
  --fg-secondary:  215 20% 62%;
  --fg-meta:       215 15% 48%;
  --fg-dim:        215 12% 34%;

  /* Status — чуть светлее для тёмного фона */
  --status-done:     142 70% 45%;
  --status-active:   35 91% 55%;
  --status-excluded: 217 19% 65%;
  --status-overdue:  0 72% 60%;

  /* Legacy aliases */
  --background:        var(--bg-page);
  --card:              var(--bg-card);
  --foreground:        var(--fg-body);
  --muted:             var(--bg-elevated);
  --muted-foreground:  var(--fg-meta);
  --border:            var(--border-div);
}
```

#### 3. Обновить базовые стили body/html

```css
html, body {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
  background: hsl(var(--bg-page));
  color: hsl(var(--fg-body));
}

/* Monospace числа — применять к классу .num */
.num, .tnum, .data-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

#### 4. Обновить `.card` базовый стиль

```css
.card {
  background: hsl(var(--bg-card));
  border: 1px solid hsl(var(--border-hair));
  border-radius: var(--r-3);
  box-shadow: var(--shadow-sm);
}
```

#### 5. Обновить скроллбар

```css
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: hsl(var(--border-div));
  border-radius: 8px;
  border: 2px solid hsl(var(--bg-page));
}
::-webkit-scrollbar-thumb:hover { background: hsl(var(--border-strong)); }
[data-theme="dark"] ::-webkit-scrollbar-thumb { background: hsl(217 33% 28%); }
```

### Acceptance criteria
- [ ] Dashboard загружается без ошибок
- [ ] В светлой теме: текст тёмный, фон светлый
- [ ] В тёмной теме: текст светлый, фон очень тёмный navy
- [ ] Шрифты Inter Tight и JetBrains Mono загружаются
- [ ] `npm run build` проходит

---

## TASK R1 — Sidebar редизайн

**Branch:** `redesign/sidebar`
**Сложность:** S (1 день)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/components/layout/Sidebar.tsx`

#### Новый CSS для sidebar (добавить в styles.css, секция Sidebar):

```css
/* ── REDESIGN: Sidebar ── */
.sidebar {
  background: hsl(var(--bg-card));
  border-right: 1px solid hsl(var(--border-hair));
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 18px 14px;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 18px;
  border-bottom: 1px solid hsl(var(--border-hair));
}

.sidebar-brand-mark {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: linear-gradient(140deg, hsl(var(--accent)), hsl(var(--indigo)));
  display: grid; place-items: center;
  font-weight: 800;
  color: hsl(var(--bg-page));
  font-size: 12px;
  box-shadow: 0 0 18px hsl(var(--accent) / 0.35);
  flex-shrink: 0;
}

.sidebar-brand-title {
  font-weight: 700;
  font-size: 12px;
  color: hsl(var(--fg-headline));
  line-height: 1.3;
}

.sidebar-brand-sub {
  font-size: 10px;
  color: hsl(var(--fg-meta));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: var(--font-mono);
  margin-top: 2px;
}

.sidebar-section-label {
  font-size: 10px;
  color: hsl(var(--fg-dim));
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0 6px;
  margin-bottom: 4px;
  font-family: var(--font-mono);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: hsl(var(--fg-secondary));
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.12s;
  text-decoration: none;
}
.sidebar-item:hover {
  background: hsl(var(--bg-elevated));
  color: hsl(var(--fg-body));
}
.sidebar-item.active {
  background: hsl(var(--accent-soft));
  color: hsl(var(--fg-headline));
  border-color: hsl(var(--accent) / 0.18);
}
.sidebar-item .sidebar-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: hsl(var(--bg-elevated));
  color: hsl(var(--fg-secondary));
  font-family: var(--font-mono);
}
.sidebar-item.active .sidebar-badge {
  background: hsl(var(--accent));
  color: hsl(var(--bg-page));
}

.sidebar-foot {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid hsl(var(--border-hair));
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(140deg, hsl(var(--fg-dim)), hsl(var(--bg-elevated)));
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700;
  color: hsl(var(--fg-body));
  flex-shrink: 0;
}
```

#### Обновить JSX в Sidebar.tsx:

Заменить существующую разметку аккордион/drawer-sidebar сохраняя всю логику (current, onChange, onLogout, isOpen) но обновив классы и добавив brand-mark с инициалами "МР":

```tsx
// Brand section — заменить существующий логотип/заголовок на:
<div className="sidebar-brand">
  <div className="sidebar-brand-mark">МР</div>
  <div>
    <div className="sidebar-brand-title">Мониторинг<br/>рекомендаций</div>
    <div className="sidebar-brand-sub">АДГС</div>
  </div>
</div>

// Каждый nav-item — обновить className:
// было: className="nav-item" / "nav-item active"
// стало: className={`sidebar-item ${active ? 'active' : ''}`}
```

### Acceptance criteria
- [ ] Sidebar имеет brand-mark с градиентом
- [ ] Активный пункт подсвечивается accent-soft фоном
- [ ] Hover-состояние работает
- [ ] На мобильном drawer открывается/закрывается как прежде

---

## TASK R2 — Topbar редизайн

**Branch:** `redesign/topbar`
**Сложность:** XS (полдня)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/components/layout/Topbar.tsx`

#### Новый CSS (добавить в styles.css):

```css
/* ── REDESIGN: Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  height: 52px;
  border-bottom: 1px solid hsl(var(--border-hair));
  background: hsl(var(--bg-card));
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

.topbar-title {
  font-size: 14px;
  font-weight: 700;
  color: hsl(var(--fg-headline));
  letter-spacing: -0.01em;
}

.topbar-meta {
  font-size: 11px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}

.topbar-spacer { flex: 1; }

.topbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border-div));
  background: hsl(var(--bg-elevated));
  width: 220px;
}
.topbar-search input {
  border: none;
  background: transparent;
  font-size: 12px;
  color: hsl(var(--fg-body));
  outline: none;
  font-family: var(--font-sans);
  width: 100%;
}
.topbar-search input::placeholder { color: hsl(var(--fg-dim)); }

.topbar-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border-div));
  background: hsl(var(--bg-elevated));
  display: grid; place-items: center;
  cursor: pointer;
  color: hsl(var(--fg-secondary));
  transition: all 0.12s;
  position: relative;
}
.topbar-btn:hover {
  background: hsl(var(--bg-hover));
  color: hsl(var(--fg-body));
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.topbar-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(140deg, hsl(var(--accent) / 0.8), hsl(var(--indigo) / 0.8));
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700;
  color: white;
}
.topbar-user-name { font-size: 13px; font-weight: 600; color: hsl(var(--fg-body)); }
.topbar-user-role { font-size: 11px; color: hsl(var(--fg-meta)); }
```

#### Обновить JSX в Topbar.tsx:

Оставить всю логику (theme toggle, menu toggle) но заменить классы. Добавить в topbar:
- Поиск (на десктопе, hidden на мобильном — `@media max-width 767px { .topbar-search { display: none; } }`)
- Аватар пользователя с инициалами (взять первые буквы из user.name если есть, иначе "АД")

### Acceptance criteria
- [ ] Topbar компактный (52px высота)
- [ ] Поиск-поле видно на десктопе, скрыто на мобильном
- [ ] Theme toggle работает как прежде
- [ ] Аватар с инициалами отображается

---

## TASK R3 — KPI карточки редизайн

**Branch:** `redesign/kpi-cards`
**Сложность:** S (1 день)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/pages/DashboardPage.tsx`

#### Новый CSS для KPI (добавить в styles.css):

```css
/* ── REDESIGN: KPI Cards ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 767px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}

.kpi-card {
  background: hsl(var(--bg-card));
  border: 1px solid hsl(var(--border-hair));
  border-radius: var(--r-3);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.kpi-card:hover { border-color: hsl(var(--border-div)); }
.kpi-card.selected {
  border-color: hsl(var(--accent));
  box-shadow: 0 0 0 1px hsl(var(--accent)), 0 0 24px hsl(var(--accent) / 0.12);
}

/* Цветная полоска слева */
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}
.kpi-card--blue::before    { background: hsl(var(--accent)); }
.kpi-card--amber::before   { background: hsl(var(--status-active)); }
.kpi-card--green::before   { background: hsl(var(--status-done)); }
.kpi-card--slate::before   { background: hsl(var(--status-excluded)); }

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}
.kpi-icon { color: hsl(var(--fg-dim)); }

.kpi-value {
  font-size: 30px;
  font-weight: 700;
  color: hsl(var(--fg-headline));
  letter-spacing: -0.02em;
  line-height: 1;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.kpi-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}
.kpi-pct { font-weight: 600; color: hsl(var(--fg-secondary)); }
.kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}
.kpi-delta--up   { background: hsl(var(--status-done-soft));    color: hsl(var(--status-done)); }
.kpi-delta--flat { background: hsl(var(--bg-elevated));          color: hsl(var(--fg-meta)); }

/* Убрать sparkline — заменить миниграфиком через SVG */
.kpi-spark { height: 28px; margin-top: 4px; }
```

#### Обновить компонент KpiCard в DashboardPage.tsx:

Новая структура JSX (сохранить все props и onClick логику):

```tsx
function KpiCard({ label, labelShort, value, pct, icon: Icon, tone, selected, onClick }) {
  return (
    <div
      className={`kpi-card kpi-card--${tone} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="kpi-top">
        <div className="kpi-label">
          {labelShort
            ? <><span className="kpi-label-full">{label}</span><span className="kpi-label-short">{labelShort}</span></>
            : label
          }
        </div>
        <div className="kpi-icon"><Icon size={16} strokeWidth={1.5} /></div>
      </div>
      <div className="kpi-value">{(value ?? 0).toLocaleString('ru')}</div>
      <div className="kpi-foot">
        {pct !== undefined && <span className="kpi-pct">{pct}%</span>}
        <span className="kpi-delta kpi-delta--flat">— нет данных</span>
      </div>
    </div>
  );
}
```

**Удалить** `SPARKLINE_PLACEHOLDER` и `<Sparkline>` из KPI карточек — убрать пустое место.

### Acceptance criteria
- [ ] 4 KPI в ряд на десктопе, 2×2 на мобильном
- [ ] Цветная полоска слева у каждой карточки
- [ ] Выбранная карточка подсвечивается accent рамкой
- [ ] Нет пустого sparkline-placeholder

---

## TASK R4 — Progress bar и Filter chips редизайн

**Branch:** `redesign/progress-filters`
**Сложность:** XS (полдня)
**Зависимости:** TASK R3

### Что сделать

Файл: `frontend/src/pages/DashboardPage.tsx` + `styles.css`

#### Прогресс-бар — обновить CSS:

```css
/* ── REDESIGN: Progress bar ── */
.progress-card {
  padding: 14px 20px;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}
.progress-header-title {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--fg-body));
}
.progress-header-stat {
  font-size: 12px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}
.progress-bar-track {
  height: 10px;
  background: hsl(var(--bg-elevated));
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  gap: 1px;
}
.progress-bar-segment {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 2px;
}
.progress-legend {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: hsl(var(--fg-secondary));
  font-family: var(--font-mono);
}
.legend-dot {
  width: 8px; height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
```

#### Filter chips — обновить CSS:

```css
/* ── REDESIGN: Filter chips bar ── */
.filter-chip-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: hsl(var(--bg-elevated));
  border: 1px solid hsl(var(--border-div));
  color: hsl(var(--fg-secondary));
  font-family: var(--font-mono);
}
.filter-chip-close {
  width: 16px; height: 16px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: hsl(var(--border-div));
  color: hsl(var(--fg-meta));
  font-size: 10px;
  cursor: pointer;
  border: none;
  transition: background 0.12s;
}
.filter-chip-close:hover { background: hsl(var(--status-overdue)); color: white; }
.filter-chip-reset {
  font-size: 11px;
  color: hsl(var(--status-overdue));
  background: transparent;
  border: none;
  cursor: pointer;
  font-weight: 600;
  padding: 4px 8px;
}
```

### Acceptance criteria
- [ ] Прогресс-бар 10px высотой с gap между сегментами
- [ ] Легенда использует `.font-mono`
- [ ] Chips округлые pill-формы
- [ ] Кнопка ✕ расширяется до 16×16px

---

## TASK R5 — ActionQueueCard редизайн

**Branch:** `redesign/action-queue`
**Сложность:** M (1.5 дня)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/components/dashboard/ActionQueueCard.tsx`

#### Новый CSS:

```css
/* ── REDESIGN: ActionQueueCard ── */
.aq-card {
  border-left: 3px solid hsl(var(--status-overdue));
  position: relative;
}
.aq-summary {
  display: flex;
  gap: 8px;
  padding: 10px 16px 6px;
  flex-wrap: wrap;
}
.aq-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.aq-pill--crit {
  background: hsl(var(--status-overdue-soft));
  color: hsl(var(--status-overdue));
  border: 1px solid hsl(var(--status-overdue) / 0.2);
}
.aq-pill--warn {
  background: hsl(var(--status-active-soft));
  color: hsl(var(--status-active));
  border: 1px solid hsl(var(--status-active) / 0.2);
}
.aq-list { display: flex; flex-direction: column; }
.aq-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid hsl(var(--border-hair));
  cursor: pointer;
  transition: background 0.12s;
  min-height: 44px;
}
.aq-row:hover { background: hsl(var(--bg-elevated)); }
.aq-row--warn .aq-days { color: hsl(var(--status-active)); background: hsl(var(--status-active-soft)); }

.aq-days {
  min-width: 42px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: hsl(var(--status-overdue));
  background: hsl(var(--status-overdue-soft));
  padding: 4px 6px;
  border-radius: 6px;
  flex-shrink: 0;
  line-height: 1.3;
}
.aq-text {
  font-size: 12px;
  line-height: 1.4;
  color: hsl(var(--fg-body));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.aq-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 11px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
  flex-wrap: wrap;
}
.aq-meta-org { color: hsl(var(--fg-secondary)); font-weight: 500; }
.aq-more {
  width: 100%;
  padding: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--accent));
  background: transparent;
  border: none;
  border-top: 1px solid hsl(var(--border-hair));
  cursor: pointer;
  transition: background 0.12s;
}
.aq-more:hover { background: hsl(var(--bg-elevated)); }
```

#### Обновить JSX в ActionQueueCard.tsx:

Добавить `className="aq-card"` на корневой `<div className="card">`.
Изменить структуру каждого item в `visibleItems.map`:

```tsx
// было: <div style={{...}} onClick=...>
// стало:
<div
  key={item.id}
  className={`aq-row ${item.tier === 'critical' ? '' : 'aq-row--warn'}`}
  role="button"
  tabIndex={0}
  onClick={() => onItemClick?.(item.responsible_org)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onItemClick?.(item.responsible_org);
    }
  }}
>
  <div className="aq-days">
    +{item.days_overdue}<br/>дн
  </div>
  <div style={{ flex: 1, minWidth: 0 }}>
    <div className="aq-text">{item.proposal_text}</div>
    <div className="aq-meta">
      <span className="aq-meta-org">{item.responsible_org}</span>
      <span>срок {item.due_raw}</span>
      <span>Цикл {item.cycle}</span>
    </div>
  </div>
</div>
```

Заменить skeleton на структурный:
```tsx
if (isLoading) return (
  <div className="card aq-card">
    <div className="skeleton" style={{ height: 16, width: 160, margin: '14px 16px 10px' }} />
    {[0,1,2,3,4].map(i => (
      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderTop: '1px solid hsl(var(--border-hair))' }}>
        <div className="skeleton" style={{ width: 42, height: 40, borderRadius: 6, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 12, marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 12, width: '60%' }} />
        </div>
      </div>
    ))}
  </div>
);
```

### Acceptance criteria
- [ ] Левая красная полоска на карточке
- [ ] Каждый item минимум 44px
- [ ] Дни-badge компактный (42px ширина, 2 строки)
- [ ] Текст 2-line clamp работает
- [ ] Keyboard navigation работает (Enter/Space)
- [ ] Структурный skeleton

---

## TASK R6 — RankedOwnersCard редизайн

**Branch:** `redesign/ranked-owners`
**Сложность:** M (1 день)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/components/dashboard/RankedOwnersCard.tsx`

#### Исправить breakpoint (C3 из аудита):
```tsx
const MOBILE_BP = 768; // было 640
```

#### Новый CSS:

```css
/* ── REDESIGN: RankedOwnersCard ── */
.ro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid hsl(var(--border-hair));
  flex-wrap: wrap;
  gap: 8px;
}
.ro-title {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--fg-body));
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

/* Segmented control */
.seg {
  display: flex;
  background: hsl(var(--bg-elevated));
  border: 1px solid hsl(var(--border-div));
  border-radius: 7px;
  padding: 2px;
  gap: 2px;
}
.seg button {
  padding: 4px 10px;
  border-radius: 5px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--fg-meta));
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  min-height: 28px;
}
.seg button.on {
  background: hsl(var(--bg-card));
  color: hsl(var(--fg-body));
  box-shadow: var(--shadow-sm);
}
@media (max-width: 767px) {
  .seg { display: none; } /* заменить на select на мобильном */
  .seg-mobile { display: block; }
}
.seg-mobile {
  display: none;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid hsl(var(--border-div));
  background: hsl(var(--bg-elevated));
  color: hsl(var(--fg-body));
  font-size: 12px;
  min-height: 36px;
}

.ro-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  border-bottom: 1px solid hsl(var(--border-hair));
  cursor: pointer;
  transition: background 0.12s;
  min-height: 44px;
}
.ro-row:last-child { border-bottom: none; }
.ro-row:hover { background: hsl(var(--bg-elevated)); }
.ro-row:focus-visible { outline: 2px solid hsl(var(--accent)); outline-offset: -2px; }

.ro-rank {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--fg-dim));
  font-family: var(--font-mono);
  width: 18px;
  flex-shrink: 0;
}
.ro-name {
  flex: 1;
  font-size: 13px;
  color: hsl(var(--fg-body));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ro-val {
  font-size: 12px;
  font-weight: 700;
  color: hsl(var(--fg-body));
  font-family: var(--font-mono);
  min-width: 48px;
  text-align: right;
  flex-shrink: 0;
}
.ro-bar {
  width: 80px;
  height: 6px;
  background: hsl(var(--bg-elevated));
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}
.ro-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}
```

#### Обновить JSX:

Заменить `onMouseEnter/onMouseLeave` инлайн-логику на CSS классы.
Добавить `<select className="seg-mobile">` для мобильного переключения метрики.
Обернуть каждую строку в `<div className="ro-row" tabIndex={0} role="button">`.

### Acceptance criteria
- [ ] MOBILE_BP = 768
- [ ] На мобильном `<select>` вместо segmented control
- [ ] Hover через CSS, не JS
- [ ] focus-visible обводка
- [ ] Каждая строка min-height 44px

---

## TASK R7 — HeatmapMatrix редизайн + touch

**Branch:** `redesign/heatmap`
**Сложность:** M (1.5 дня)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/components/charts/HeatmapMatrix.tsx`

#### Ключевые изменения:

1. **Responsive SVG через viewBox** (фикс C2):
```tsx
const svgW = LABEL_W + cycles.length * CELL_W;
const svgH = HEADER_H + spheres.length * CELL_H;
return (
  <div style={{ overflowX: 'auto' }}>
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', minWidth: svgW, height: 'auto' }}
      xmlns="http://www.w3.org/2000/svg"
    >
```

2. **Touch tooltip** на каждой ячейке:
```tsx
onTouchStart={(e) => {
  if (!d) return;
  e.stopPropagation();
  const t = e.touches[0];
  setTooltip({ x: t.clientX, y: t.clientY, d });
}}
```

3. **Закрытие tooltip при скролле** (фикс m8):
```tsx
useEffect(() => {
  const close = () => setTooltip(null);
  window.addEventListener('scroll', close, { passive: true });
  return () => window.removeEventListener('scroll', close);
}, []);
```

4. **`<title>` на строках** для полного имени сферы:
```tsx
<g key={sphere}>
  <title>{sphere}</title>
  ...
</g>
```

5. **Цвета через CSS переменные** вместо хардкода:
```tsx
// row label fill:
fill="hsl(var(--fg-meta))"
// header label fill:
fill="hsl(var(--fg-meta))"
// empty cell:
fill="hsl(var(--bg-elevated))"
```

6. **CSS класс для карточки**:
```css
.hm-card .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid hsl(var(--border-hair));
}
```

### Acceptance criteria
- [ ] SVG масштабируется на мобильном (не обрезается)
- [ ] Тап по ячейке показывает tooltip
- [ ] Tooltip закрывается при скролле
- [ ] Пустые ячейки имеют bg-elevated цвет (не белый в dark mode)
- [ ] Названия сфер: при hover/тап показывает полное имя через `<title>`

---

## TASK R8 — CycleFunnel редизайн

**Branch:** `redesign/cycle-funnel`
**Сложность:** S (1 день)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/components/charts/CycleFunnel.tsx`

#### Новый CSS:

```css
/* ── REDESIGN: CycleFunnel ── */
.funnel-row {
  display: grid;
  grid-template-columns: 1fr 80px;
  gap: 8px;
  margin-bottom: 10px;
}
.funnel-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.funnel-label {
  font-size: 12px;
  color: hsl(var(--fg-secondary));
}
.funnel-val {
  font-size: 13px;
  font-weight: 700;
  color: hsl(var(--fg-body));
  font-family: var(--font-mono);
  text-align: right;
}
.funnel-pct {
  font-size: 11px;
  font-weight: 400;
  color: hsl(var(--fg-meta));
  margin-left: 4px;
}
.funnel-track {
  height: 10px;
  background: hsl(var(--bg-elevated));
  border-radius: 6px;
  overflow: hidden;
  grid-column: 1 / -1;
}
.funnel-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.45s ease;
}

/* Select на мобильном */
.funnel-select {
  padding: 8px 12px;
  border-radius: 7px;
  border: 1px solid hsl(var(--border-div));
  background: hsl(var(--bg-elevated));
  color: hsl(var(--fg-body));
  font-size: 12px;
  font-family: var(--font-sans);
  min-height: 36px;
  cursor: pointer;
}
@media (max-width: 767px) {
  .funnel-select { min-height: 44px; }
}
```

#### Обновить JSX компонента `FunnelBar`:

```tsx
// Новая структура — лейбл и значение над баром, на отдельной строке
function FunnelBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="funnel-label-row">
        <span className="funnel-label">{label}</span>
        <span className="funnel-val">
          {count.toLocaleString('ru')}
          <span className="funnel-pct">{pct}%</span>
        </span>
      </div>
      <div className="funnel-track">
        <div
          className="funnel-fill"
          style={{
            width: `${pct}%`,
            background: color,
            minWidth: count > 0 ? 4 : 0,
            opacity: count === 0 ? 0.3 : 1,
          }}
        />
      </div>
    </div>
  );
}
```

Добавить `aria-label="Выбрать цикл"` на `<select>`.

### Acceptance criteria
- [ ] Лейбл сверху бара (не сбоку) — нет проблем с длинными текстами
- [ ] Нулевые бары: opacity 0.3 + minWidth 4px
- [ ] Select: min-height 36px десктоп, 44px мобильный
- [ ] aria-label на select

---

## TASK R9 — RegistryPage mobile улучшения

**Branch:** `redesign/registry-mobile`
**Сложность:** M (1.5 дня)
**Зависимости:** TASK R0

### Что сделать

Файл: `frontend/src/pages/RegistryPage.tsx` + `styles.css`

#### 1. Условный рендер вместо CSS hide (фикс M9):

```tsx
// Добавить хук
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  setIsMobile(mq.matches);
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);

// В JSX:
{isMobile ? (
  <div className="registry-cards">
    {items.map(item => <RegCard key={item.id} item={item} onClick={() => setDetailItem(item)} />)}
  </div>
) : (
  <div className="table-wrap">
    {/* существующая таблица без изменений */}
  </div>
)}
```

#### 2. Новый дизайн RegCard:

```css
/* ── REDESIGN: Registry mobile card ── */
.rec-card {
  background: hsl(var(--bg-card));
  border: 1px solid hsl(var(--border-hair));
  border-radius: var(--r-3);
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.12s;
  -webkit-tap-highlight-color: transparent;
  min-height: 60px;
}
.rec-card:active { background: hsl(var(--bg-elevated)); }

.rec-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  flex-wrap: wrap;
}

.rec-cycle {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: hsl(var(--accent));
  background: hsl(var(--accent-soft));
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}

.rec-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--font-mono);
}
.rec-status.done {
  background: hsl(var(--status-done-soft));
  color: hsl(var(--status-done));
}
.rec-status.work {
  background: hsl(var(--status-active-soft));
  color: hsl(var(--status-active));
}
.rec-status.overdue {
  background: hsl(var(--status-overdue-soft));
  color: hsl(var(--status-overdue));
}
.rec-status.excluded {
  background: hsl(var(--status-excluded-soft));
  color: hsl(var(--status-excluded));
}

.rec-due {
  margin-left: auto;
  font-size: 11px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}
.rec-due.overdue { color: hsl(var(--status-overdue)); font-weight: 600; }

.rec-text {
  font-size: 13px;
  line-height: 1.4;
  color: hsl(var(--fg-body));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 7px;
}

.rec-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}
.rec-meta-dot {
  width: 3px; height: 3px;
  border-radius: 50%;
  background: hsl(var(--fg-dim));
  flex-shrink: 0;
}
```

#### 3. Горизонтальный скролл фильтров на мобильном:

```css
@media (max-width: 767px) {
  .filters-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }
  .filters-row::-webkit-scrollbar { display: none; }

  .mob-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid hsl(var(--border-div));
    background: hsl(var(--bg-elevated));
    color: hsl(var(--fg-secondary));
    cursor: pointer;
    min-height: 36px;
  }
  .mob-filter-chip.on {
    background: hsl(var(--accent-soft));
    color: hsl(var(--accent));
    border-color: hsl(var(--accent) / 0.3);
  }
}
```

### Acceptance criteria
- [ ] На 375px рендерятся карточки (не таблица), на 1024px — таблица
- [ ] DOM содержит только одну разметку (не обе одновременно)
- [ ] Status pill правильно окрашивается по статусу
- [ ] Фильтр-чипы скроллятся горизонтально без scrollbar

---

## TASK R10 — Dashboard layout финальный

**Branch:** `redesign/dashboard-layout`
**Сложность:** M (1 день)
**Зависимости:** R3, R4, R5, R6, R7, R8

### Что сделать

Файл: `frontend/src/pages/DashboardPage.tsx` + `styles.css`

#### Новый grid layout для Dashboard:

```css
/* ── REDESIGN: Dashboard layout ── */
.dashboard-page {
  padding: 20px 24px 40px;
  max-width: 1440px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 3 колонки для цикл-чарт + action queue */
.dashboard-row-3 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
}

/* 2 равных колонки */
.dashboard-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* Card заголовок — стандартный */
.card-hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid hsl(var(--border-hair));
}
.card-title {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--fg-body));
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}
.card-subtitle {
  font-size: 11px;
  color: hsl(var(--fg-meta));
  font-family: var(--font-mono);
}

@media (max-width: 1024px) {
  .dashboard-row-3,
  .dashboard-row-2 { grid-template-columns: 1fr; }
}

@media (max-width: 767px) {
  .dashboard-page { padding: 12px 12px 80px; gap: 12px; }
}
```

#### Переструктурировать JSX layout в DashboardPage:

```tsx
return (
  <div className="dashboard-page">
    {/* KPI */}
    <div className="kpi-grid">
      {/* 4 KPI карточки */}
    </div>

    {/* Filter chips + saved views */}
    {selectedStatus && <FilterChipBar />}
    <SavedViewsBar />

    {/* Прогресс */}
    <div className="card progress-card">
      {/* Progress bar */}
    </div>

    {/* Trend */}
    <TrendCard weeks={12} />

    {/* Графики по циклам */}
    <div className="dashboard-row-2">
      <div className="card">{/* Stacked bar */}</div>
      <div className="card">{/* Line chart */}</div>
    </div>

    {/* Только для analyst/admin */}
    {isAnalyst && (
      <>
        {/* Чарт + Очередь */}
        <div className="dashboard-row-3">
          <div className="card">{/* Лидеры по сферам */}</div>
          <ActionQueueCard />
        </div>

        {/* Топ ведомств + Воронка */}
        <div className="dashboard-row-2">
          <RankedOwnersCard />
          <CycleFunnel cycles={cycles} />
        </div>

        {/* Форма закрытия */}
        <div className="dashboard-row-2">
          <div className="card">{/* Форма закрытия */}</div>
          <div />
        </div>

        {/* Heatmap full width */}
        <SphereCycleCard />
      </>
    )}
  </div>
);
```

#### Обновить заголовки карточек на новый стиль:

Все `<div className="card-title-row">` заменить на `<div className="card-hd">`.
Все `<div className="card-title">` → использовать `card-title` класс (уже есть в CSS выше).
Все `<div className="card-meta">` → `card-subtitle`.

### Acceptance criteria
- [ ] Десктоп: CycleChart + ActionQueue рядом (2/3 + 1/3)
- [ ] Десктоп: RankedOwners + Funnel рядом (1/2 + 1/2)
- [ ] На 1024px — однколонная раскладка
- [ ] На 767px — мобильный вид с bottom padding 80px
- [ ] Viewer видит только KPI + прогресс + тренд + циклы

---

## TASK R11 — Dark mode финальные фиксы

**Branch:** `redesign/dark-mode-fixes`
**Сложность:** S (1 день)
**Зависимости:** R0, R10

### Что сделать

Файл: `styles.css`

#### Заменить все захардкоженные hex в dark mode (фикс M2):

Добавить в `styles.css` блок с CSS-переменными для Chart.js:

```css
/* Chart.js цвета через переменные для chartTheme.ts */
/* Обновить lib/chartTheme.ts — добавить функцию getColor */
```

#### Обновить `frontend/src/lib/chartTheme.ts`:

```ts
export function getChartTheme() {
  const style = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return {
    // Backgrounds
    cardBg: isDark ? 'hsl(222 47% 8%)' : 'hsl(0 0% 100%)',
    elevated: isDark ? 'hsl(222 47% 11%)' : 'hsl(220 20% 96%)',

    // Text
    muted: isDark ? 'hsl(215 20% 62%)' : 'hsl(222 15% 52%)',
    body: isDark ? 'hsl(215 30% 84%)' : 'hsl(222 30% 18%)',

    // Status
    statusDone:     isDark ? 'hsl(142 70% 45%)' : 'hsl(158 64% 38%)',
    statusActive:   isDark ? 'hsl(35 91% 55%)'  : 'hsl(35 91% 48%)',
    statusExcluded: isDark ? 'hsl(217 19% 65%)' : 'hsl(217 19% 55%)',
    statusOverdue:  isDark ? 'hsl(0 72% 60%)'   : 'hsl(0 72% 51%)',

    // Grid
    grid: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.10)',

    // Accent
    accent:     isDark ? 'hsl(199 89% 55%)' : 'hsl(199 89% 48%)',
    analiz:     isDark ? 'hsl(217 91% 65%)' : 'hsl(217 91% 60%)',
    monitoring: isDark ? 'hsl(252 80% 70%)' : 'hsl(252 80% 62%)',
  };
}
```

#### Обновить таблицу в dark mode:

```css
[data-theme="dark"] .table tbody tr:hover td {
  background: hsl(222 47% 14%) !important;
}
[data-theme="dark"] .table td {
  border-bottom-color: hsl(217 33% 16%) !important;
}
[data-theme="dark"] .table th {
  background: hsl(222 47% 11%) !important;
  color: hsl(215 20% 62%) !important;
}
```

#### Skeleton в dark mode:

```css
[data-theme="dark"] .skeleton {
  background: linear-gradient(
    90deg,
    hsl(222 47% 11%) 0%,
    hsl(222 47% 18%) 50%,
    hsl(222 47% 11%) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}
```

### Acceptance criteria
- [ ] Таблица в dark mode: строки различимы, hover работает
- [ ] Skeleton в dark mode анимируется заметно
- [ ] Chart.js графики в dark mode используют правильные цвета

---

## TASK R12 — Mobile fixes финальные

**Branch:** `redesign/mobile-fixes`
**Сложность:** S (1 день)
**Зависимости:** R0

### Что сделать

Файл: `styles.css` + `frontend/src/components/layout/BottomNav.tsx`

#### Bottom nav safe-area фикс (C8):

```css
@media (max-width: 767px) {
  .bottom-nav {
    height: calc(56px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    align-items: center; /* было stretch */
  }
  .bottom-nav-btn {
    height: 56px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .page-content {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 72px) !important;
  }
}
```

#### BottomNav cases-dashboard активный стейт (M8):

В `BottomNav.tsx` изменить определение активности кнопки Cases:
```tsx
// было: current === 'cases'
// стало:
const isCasesActive = current === 'cases' || current === 'cases-dashboard';
```

#### Кнопки min-height на мобильном (m10):

```css
@media (max-width: 767px) {
  .btn, .btn-primary, .btn-secondary, .btn-ghost {
    min-height: 44px;
  }
}
```

#### FilterChipBar кнопка ✕ (M6):

В DashboardPage.tsx — кнопки ✕ в FilterChipBar:
```tsx
<button
  aria-label={`Убрать фильтр ${label}`}
  style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex',
           alignItems: 'center', justifyContent: 'center', border: 'none',
           background: 'hsl(var(--border-div))', cursor: 'pointer' }}
>✕</button>
```

### Acceptance criteria
- [ ] iOS safe area не дублируется
- [ ] cases-dashboard подсвечивает Кейсы ТД в BottomNav
- [ ] Все .btn на мобильном минимум 44px
- [ ] ✕ в chips нажимается пальцем

---

## Рекомендованный порядок запуска

```
Сессия 1 (фундамент):
  R0 — токены и шрифты (ПЕРВЫМ ОБЯЗАТЕЛЬНО)

Сессия 2 (параллельно):
  R1 — Sidebar
  R2 — Topbar
  R12 — Mobile fixes (независим)

Сессия 3 (параллельно):
  R3 — KPI карточки
  R5 — ActionQueueCard
  R6 — RankedOwnersCard

Сессия 4 (параллельно):
  R4 — Progress + Filter chips
  R7 — HeatmapMatrix
  R8 — CycleFunnel

Сессия 5 (финал):
  R9 — Registry mobile
  R10 — Dashboard layout (последний из UI)
  R11 — Dark mode финальные фиксы

Мержи: после каждой сессии git merge всех веток → main
```

## Итоговая оценка

| Фаза | Задач | Дней |
|---|---|---|
| Сессия 1 | 1 | 1 |
| Сессия 2 | 3 | 1.5 |
| Сессия 3 | 3 | 2 |
| Сессия 4 | 3 | 2.5 |
| Сессия 5 | 3 | 2 |
| **Итого** | **13** | **~9 дней** |

## Что НЕ меняем

- Вся backend логика (queries, routes, migrations)
- Роли и права доступа
- API-запросы и TanStack Query
- Drill-down навигация
- Фильтры и state
- Cases / CasesDashboard логика
- KazakhstanMap логика (только стили)
