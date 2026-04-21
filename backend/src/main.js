import express from 'express';
import cors from 'cors';
import dashboardRouter from './routes/dashboard.js';
import recommendationsRouter from './routes/recommendations.js';
import adminRegistryRouter from './routes/adminRegistry.js';
import exportRouter from './routes/export.js';
import { pool } from './db/pool.js';

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/dashboard', dashboardRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/admin/registry', adminRegistryRouter);
app.use('/api/export', exportRouter);

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
  await renameStatus();
  await normalizeExistingStatuses();
});

