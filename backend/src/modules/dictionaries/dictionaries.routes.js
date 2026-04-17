import { Router } from 'express';
import { pool } from '../../db/queries/pool.js';

const router = Router();

router.get('/status', async (_req, res) => {
  const result = await pool.query(
    'select * from monitoring.dict_status where is_active = true order by normalized_value'
  );
  res.json(result.rows);
});

router.get('/sphere', async (_req, res) => {
  const result = await pool.query(
    'select * from monitoring.dict_sphere where is_active = true order by normalized_value'
  );
  res.json(result.rows);
});

export default router;
