import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dashboardRouter from './routes/dashboard.js';
import recommendationsRouter from './routes/recommendations.js';
import adminRegistryRouter from './routes/adminRegistry.js';
import exportRouter from './routes/export.js';
import { pool } from './db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    // Check if old camelCase schema exists and recreate if needed
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
  await renameStatus();
  await normalizeExistingStatuses();
});

