import express from 'express';
import { getDashboardSummary, getStatusTrends, getActionQueue } from '../db/queries/recommendations.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
const nonTd = requireRole('admin', 'analyst', 'viewer');

router.get('/summary', authMiddleware, nonTd, async (req, res) => {
  try {
    const includeCo = req.query.include_co === '1';
    const data = await getDashboardSummary({ includeCo });
    res.json(data);
  } catch (error) {
    console.error('dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

router.get('/trends', authMiddleware, nonTd, async (req, res) => {
  try {
    const weeks = Math.min(Math.max(Number(req.query.weeks) || 12, 1), 52);
    const data = await getStatusTrends(weeks);
    res.json(data);
  } catch (error) {
    console.error('trends error:', error);
    res.status(500).json({ error: 'Failed to load trends' });
  }
});

router.get('/action-queue', authMiddleware, nonTd, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const data = await getActionQueue(limit);
    res.json(data);
  } catch (error) {
    console.error('action-queue error:', error);
    res.status(500).json({ error: 'Failed to load action queue' });
  }
});

export default router;
