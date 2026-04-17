#!/usr/bin/env bash
set -e

echo "1) cd /Users/askhat/projects/post-monitoring-app"
echo "2) cp .env.example .env"
echo "3) Вставьте DATABASE_URL в .env"
echo "4) Выполните SQL: sql/001_init.sql, sql/002_seed_status.sql, sql/003_seed_sphere.sql"
echo "5) npm run setup:all"
echo "6) cd backend && npm run dev"
echo "7) cd frontend && npm run dev"
echo "8) cd import-worker && npm run dev"
