import express from 'express';
import {
  getRecommendationById,
  getRecommendationFilters,
  getStatusHistory,
  listRecommendations,
  updateRecommendationStatus,
  bulkUpdateStatus,
} from '../db/queries/recommendations.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const nonTd      = requireRole('admin', 'analyst', 'viewer');
const adminAnalyst = requireRole('admin', 'analyst');

router.get('/filters', nonTd, async (_req, res) => {
  try {
    const data = await getRecommendationFilters();
    res.json(data);
  } catch (error) {
    console.error('filters error:', error);
    res.status(500).json({ error: 'Failed to load filters' });
  }
});

router.get('/', nonTd, async (req, res) => {
  try {
    const data = await listRecommendations(req.query);
    res.json(data);
  } catch (error) {
    console.error('recommendations list error:', error);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

// Must be registered BEFORE /:id routes to prevent "bulk" being treated as an id
router.patch('/bulk/status', adminAnalyst, async (req, res) => {
  try {
    const { ids, ...payload } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const results = await bulkUpdateStatus(ids, payload);
    res.json({ ok: true, updated: results.length });
  } catch (error) {
    console.error('bulk status error:', error);
    res.status(500).json({ error: 'Failed to bulk update status' });
  }
});

router.get('/:id', nonTd, async (req, res) => {
  try {
    const item = await getRecommendationById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('recommendation detail error:', error);
    res.status(500).json({ error: 'Failed to load recommendation' });
  }
});

router.get('/:id/history', nonTd, async (req, res) => {
  try {
    const history = await getStatusHistory(req.params.id);
    res.json(history);
  } catch (error) {
    console.error('status history error:', error);
    res.status(500).json({ error: 'Failed to load status history' });
  }
});

router.patch('/:id/status', adminAnalyst, async (req, res) => {
  try {
    const updated = await updateRecommendationStatus(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ ok: true, id: updated.id });
  } catch (error) {
    console.error('recommendation patch error:', error);
    res.status(500).json({ error: 'Failed to update recommendation status' });
  }
});

export default router;
