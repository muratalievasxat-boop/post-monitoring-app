import express from 'express';
import { getDashboardSummary, getStatusTrends, getActionQueue, getSphereCycleMatrix, getSphereTotals, getOwnersRanking, getCycleFunnel } from '../db/queries/recommendations.js';
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

router.get('/sphere-cycle-matrix', authMiddleware, nonTd, async (req, res) => {
  try {
    res.json(await getSphereCycleMatrix());
  } catch (error) {
    console.error('sphere-cycle-matrix error:', error);
    res.status(500).json({ error: 'Failed to load sphere-cycle matrix' });
  }
});

router.get('/sphere-totals', authMiddleware, nonTd, async (req, res) => {
  try {
    res.json(await getSphereTotals());
  } catch (error) {
    console.error('sphere-totals error:', error);
    res.status(500).json({ error: 'Failed to load sphere totals' });
  }
});

router.get('/owners-ranking', authMiddleware, nonTd, async (req, res) => {
  try {
    const metric = req.query.metric || 'volume';
    const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 50);
    const data = await getOwnersRanking(metric, limit);
    res.json(data);
  } catch (error) {
    console.error('owners-ranking error:', error);
    res.status(500).json({ error: 'Failed to load owners ranking' });
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

router.get('/cycle-funnel', authMiddleware, nonTd, async (req, res) => {
  try {
    const cycle = String(req.query.cycle ?? '').trim();
    if (!cycle) return res.status(400).json({ error: 'cycle required' });
    const data = await getCycleFunnel(cycle);
    res.json(data);
  } catch (error) {
    console.error('cycle-funnel error:', error);
    res.status(500).json({ error: 'Failed to load cycle funnel' });
  }
});

export default router;
