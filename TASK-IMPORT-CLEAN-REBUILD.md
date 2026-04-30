# TASK: Clean Import & Rebuild (финальный импорт)

## Цель
Очистить всё, импортировать свежие данные из xlsx и использовать ТОЛЬКО `public` schema.

## Ожидаемые результаты
- Всего: 1335 записей
- В работе + Не поддерживается: 633 + 34 = 667
- Исполнено: 475
- Для снятия с контроля: 193

## Что делать

### Шаг 1: Очистить public.recommendations
```sql
truncate table public.recommendations cascade;
```

### Шаг 2: Загрузить данные из xlsx в public.recommendations

Файл: `~/Downloads/Пост-мониторинг свод на 14.04.xlsx`
Лист: `перечень`
Строки: 3-1337 (row 1-2 это заголовки)

Маппинг колонок xlsx → БД:
A (1)  → id (UUID, сгенерировать)
A (1)  → seq_no (скопировать из П/п)
B (2)  → record_type_normalized ('Мониторинг' или 'Анализ')
C (3)  → cycle (ЦИКЛ)
D (4)  → sphere_normalized (Сфера)
E (5)  → proposal_text (Предложения)
F (6)  → responsible_org (Ответственный исполнитель)
G (7)  → interested_orgs (Заинтересованные органы)
H (8)  → completion_form (Форма завершения)
I (9)  → due_raw (Срок исполнения)
J (10) → status_normalized (Статус ГО) ← ГЛАВНОЕ

Вставить в `public.recommendations`:
```sql
INSERT INTO public.recommendations (
  id, seq_no, record_type_normalized, cycle, sphere_normalized,
  proposal_text, responsible_org, interested_orgs, completion_form,
  due_raw, status_normalized, created_at, updated_at
) VALUES (...)
```

### Шаг 3: Перенести recommendation_responsible из monitoring в public

```sql
-- Создать таблицу в public (если её нет)
CREATE TABLE IF NOT EXISTS public.recommendation_responsible (
  id bigserial primary key,
  record_id uuid not null references public.recommendations(id) on delete cascade,
  org_name text not null,
  role text not null check (role in ('primary', 'co')),
  position int not null,
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_resp_record_org 
  ON public.recommendation_responsible(record_id, org_name);

-- Скопировать данные из monitoring
INSERT INTO public.recommendation_responsible (record_id, org_name, role, position, created_at)
SELECT record_id, org_name, role, position, created_at
FROM monitoring.recommendation_responsible
ON CONFLICT (record_id, org_name) DO NOTHING;
```

### Шаг 4: Обновить backend/src/db/queries/recommendations.js

**Заменить все `monitoring.recommendations` на просто `recommendations`**
**Заменить все `monitoring.recommendation_responsible` на просто `recommendation_responsible`**

Ключевые места (примерно строки 30-100):
```javascript
const activeSql   = `(status_normalized ilike 'в работе%' or status_normalized = 'Не поддерживается')`;
const doneSql     = `status_normalized ilike 'исполнено%'`;
const excludedSql = `(status_normalized like 'для снятия с контроля%')`;

// Все FROM/JOIN должны быть:
from public.recommendations r
left join public.recommendation_responsible rr on ...
```

## Проверка
После импорта:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE lower(status_normalized) IN ('в работе', 'не поддерживается')) as active,
  COUNT(*) FILTER (WHERE lower(status_normalized) = 'исполнено') as done,
  COUNT(*) FILTER (WHERE lower(status_normalized) = 'для снятия с контроля') as excluded
FROM public.recommendations;
```

Должно быть: 1335 | 667 | 475 | 193

## Файлы для изменения
- backend/src/db/queries/recommendations.js (обновить SQL на public schema)
- backend/src/routes/dashboard.js (если нужно)

## Файлы для создания
- tools/import-xlsx-clean.js (Node.js скрипт для импорта xlsx в public.recommendations)