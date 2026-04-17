import { Router } from 'express';

const router = Router();

router.get('/health', async (_req, res) => {
  res.json({ ok: true, message: 'imports module placeholder' });
});

export default router;
