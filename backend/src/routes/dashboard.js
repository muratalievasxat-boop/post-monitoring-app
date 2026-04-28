import express from 'express';
import { getDashboardSummary } from '../db/queries/recommendations.js';
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

export default router;
