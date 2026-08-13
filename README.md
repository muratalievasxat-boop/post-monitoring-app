# post-monitoring-app

Стартовый monorepo для MVP мониторинга рекомендаций постмониторинга.

## Быстрый старт

1. Создайте Neon PostgreSQL и получите `DATABASE_URL`.
2. Скопируйте `.env.example` в `.env`.
3. Запустите SQL-миграции из `sql/` по порядку, включая UUID-схему `sql/009_public_recommendations_uuid.sql`.
4. Установите зависимости по пакетам.

## Чистый импорт рекомендаций

После применения миграций импорт выполняется только в `public` schema:

```sh
DATABASE_URL=postgresql://... npm run import:recommendations -- "/path/to/Пост-мониторинг свод на 14.04.xlsx"
```

Импорт транзакционно очищает `public.recommendations`, загружает строки 3–1337
листа `перечень`, переносит связанные органы из legacy `monitoring` через
`seq_no` и проверяет контрольные значения до фиксации транзакции.

## Структура
- `backend` — API
- `import-worker` — импорт Excel и upsert
- `frontend` — UI
- `sql` — DDL и seed
