import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dashboardRouter from './routes/dashboard.js';
import recommendationsRouter from './routes/recommendations.js';
import adminRegistryRouter from './routes/adminRegistry.js';
import exportRouter from './routes/export.js';
import authRouter from './routes/auth.js';
import casesRouter from './routes/cases.js';
import usersRouter from './routes/users.js';
import { pool } from './db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const TD_LIST = [
  'город Астана',
  'город Алматы',
  'Акмолинская область',
  'Актюбинская область',
  'Алматинская область',
  'Атырауская область',
  'Западно-Казахстанская область',
  'Жамбылская область',
  'Карагандинская область',
  'Костанайская область',
  'Кызылординская область',
  'Мангистауская область',
  'Туркестанская область',
  'Павлодарская область',
  'Северо-Казахстанская область',
  'Восточно-Казахстанская область',
  'город Шымкент',
  'Область Абай',
  'Область Жетісу',
  'Область Ұлытау',
];

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/status-history/recent', async (_req, res) => {
  try {
    const result = await pool.query(`
      select id, record_id, old_status, new_status, comment, changed_at
      from status_history
      order by changed_at desc
      limit 100
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('status-history/recent error:', e.message);
    res.json([]);
  }
});

app.use('/api/dashboard', dashboardRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/admin/registry', adminRegistryRouter);
app.use('/api/export', exportRouter);
app.use('/api/auth', authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/users', usersRouter);

// Serve frontend in production
const frontendDist = join(__dirname, '../../frontend/dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

async function createStatusHistoryTable() {
  try {
    const check = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'status_history' AND column_name = 'old_status'
    `);
    if (check.rowCount === 0) {
      await pool.query(`DROP TABLE IF EXISTS status_history`);
      await pool.query(`
        CREATE TABLE status_history (
          id SERIAL PRIMARY KEY,
          record_id INTEGER NOT NULL,
          old_status TEXT,
          new_status TEXT,
          comment TEXT,
          changed_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('[migration] status_history table created');
    } else {
      console.log('[migration] status_history table ready');
    }
  } catch (e) {
    console.error('[migration] status_history table creation failed:', e.message);
  }
}

async function createTdSummariesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS td_summaries (
        td_name TEXT PRIMARY KEY,
        summary TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('[migration] td_summaries table ready');
  } catch (e) {
    console.error('[migration] td_summaries failed:', e.message);
  }
}

async function createCasesTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'td')),
        td_name TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        sphere TEXT,
        problem TEXT,
        problem_description TEXT,
        solution TEXT,
        npa_refs TEXT,
        measurable_effect JSONB,
        td_name TEXT,
        submitted_by INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','in_review','returned','accepted','rejected')),
        analyst_comment TEXT,
        auto_summary TEXT,
        manual_summary TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS case_comments (
        id SERIAL PRIMARY KEY,
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    console.log('[migration] cases tables ready');
  } catch (e) {
    console.error('[migration] cases tables failed:', e.message);
  }
}

async function createDefaultAdmin() {
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = 'admin@debiuro.kz'");
    if (existing.rowCount > 0) return;
    const hash = await bcrypt.hash('Admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
      ['admin@debiuro.kz', hash, 'Администратор', 'admin']
    );
    console.log('[migration] default admin created: admin@debiuro.kz / Admin123');
  } catch (e) {
    console.error('[migration] default admin creation failed:', e.message);
  }
}

async function renameStatus() {
  try {
    const result = await pool.query(`
      UPDATE registry_records
      SET
        status_normalized = 'Для снятия с контроля',
        status_raw = 'Для снятия с контроля'
      WHERE status_normalized = 'Не поддерживается - исключить'
    `);
    if (result.rowCount > 0) {
      console.log(`[migration] Renamed ${result.rowCount} rows: "Не поддерживается - исключить" → "Для снятия с контроля"`);
    }
  } catch (e) {
    console.error('[migration] Status rename failed:', e.message);
  }
}


async function normalizeSpecificStatuses() {
  const map = [
    ['в работе', 'В работе'],
    ['исполнено', 'Исполнено'],
    ['для снятия с контроля', 'Для снятия с контроля'],
  ];
  try {
    let total = 0;
    for (const [from, to] of map) {
      const r = await pool.query(
        `UPDATE registry_records SET status_normalized = $2, status_raw = $2
         WHERE lower(btrim(status_normalized)) = $1 AND status_normalized <> $2`,
        [from, to],
      );
      if (r.rowCount > 0) {
        console.log(`[migration] "${from}" → "${to}": ${r.rowCount} rows`);
        total += r.rowCount;
      }
    }
    if (total === 0) console.log('[migration] normalizeSpecificStatuses: nothing to update');
  } catch (e) {
    console.error('[migration] normalizeSpecificStatuses failed:', e.message);
  }
}

async function normalizeExistingStatuses() {
  try {
    const result = await pool.query(`
      UPDATE registry_records
      SET
        status_normalized =
          upper(left(btrim(lower(status_normalized)), 1))
          || lower(substring(btrim(status_normalized) from 2)),
        status_raw =
          upper(left(btrim(lower(status_raw)), 1))
          || lower(substring(btrim(status_raw) from 2))
      WHERE
        coalesce(btrim(status_normalized), '') <> ''
        AND status_normalized IS DISTINCT FROM (
          upper(left(btrim(lower(status_normalized)), 1))
          || lower(substring(btrim(status_normalized) from 2))
        )
    `);
    if (result.rowCount > 0) {
      console.log(`[migration] Normalized ${result.rowCount} status values in registry_records`);
    }
  } catch (e) {
    console.error('[migration] Status normalization failed:', e.message);
  }
}

app.listen(port, async () => {
  console.log(`Backend started on port ${port}`);
  await createStatusHistoryTable();
  await createCasesTables();
  await createTdSummariesTable();
  await createDefaultAdmin();
  await renameStatus();
  await normalizeSpecificStatuses();
  await normalizeExistingStatuses();
});
