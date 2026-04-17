import express from 'express';
import {
  getRecommendationById,
  getRecommendationFilters,
  listRecommendations,
  updateRecommendationStatus,
} from '../db/queries/recommendations.js';

const router = express.Router();

router.get('/filters', async (_req, res) => {
  try {
    const data = await getRecommendationFilters();
    res.json(data);
  } catch (error) {
    console.error('filters error:', error);
    res.status(500).json({ error: 'Failed to load filters' });
  }
});

router.get('/', async (req, res) => {
  try {
    const data = await listRecommendations(req.query);
    res.json(data);
  } catch (error) {
    console.error('recommendations list error:', error);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

router.get('/:id', async (req, res) => {
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

router.patch('/:id/status', async (req, res) => {
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
