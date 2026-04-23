import express from 'express';
import { getDashboardSummary } from '../db/queries/recommendations.js';
import { pool } from '../db/pool.js';

const router = express.Router();

router.get('/status-debug', async (_req, res) => {
  try {
    const result = await pool.query(`
      select
        btrim(lower(coalesce(status_normalized, ''))) as status,
        count(*)::int as cnt
      from registry_records
      group by 1
      order by cnt desc
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/summary', async (_req, res) => {
  try {
    const data = await getDashboardSummary();
    console.log('DASHBOARD SUMMARY FROM ROUTE:', JSON.stringify(data.totals));
    res.json(data);
  } catch (error) {
    console.error('dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

export default router;
