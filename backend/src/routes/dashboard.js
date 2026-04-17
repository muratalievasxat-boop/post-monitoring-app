import express from 'express';
import { getDashboardSummary } from '../db/queries/recommendations.js';

const router = express.Router();

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
