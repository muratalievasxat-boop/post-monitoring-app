# post-monitoring-app

Стартовый monorepo для MVP мониторинга рекомендаций постмониторинга.

## Быстрый старт

1. Создайте Neon PostgreSQL и получите `DATABASE_URL`.
2. Скопируйте `.env.example` в `.env`.
3. Запустите SQL из `sql/001_init.sql`, `sql/002_seed_status.sql`, `sql/003_seed_sphere.sql`.
4. Установите зависимости по пакетам.

## Структура
- `backend` — API
- `import-worker` — импорт Excel и upsert
- `frontend` — UI
- `sql` — DDL и seed
