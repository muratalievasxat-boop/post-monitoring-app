import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/cases/stats — агрегированная аналитика (admin/analyst/viewer)
router.get('/stats', requireRole('admin', 'analyst', 'viewer'), async (_req, res) => {
  try {
    const [totalsR, byTdR, bySphereR] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int                                                             AS total,
          SUM(CASE WHEN status='accepted'                   THEN 1 ELSE 0 END)::int AS accepted,
          SUM(CASE WHEN status='rejected'                   THEN 1 ELSE 0 END)::int AS rejected,
          SUM(CASE WHEN status IN('pending','in_review')    THEN 1 ELSE 0 END)::int AS in_review,
          SUM(CASE WHEN status='returned'                   THEN 1 ELSE 0 END)::int AS returned
        FROM cases
      `),
      pool.query(`
        SELECT
          c.td_name,
          COUNT(*)::int                                                             AS total,
          SUM(CASE WHEN c.status='accepted'                THEN 1 ELSE 0 END)::int AS accepted,
          SUM(CASE WHEN c.status='rejected'                THEN 1 ELSE 0 END)::int AS rejected,
          SUM(CASE WHEN c.status='returned'                THEN 1 ELSE 0 END)::int AS returned,
          ROUND(LEAST(SUM(CASE WHEN c.status='accepted' THEN 1 ELSE 0 END) * 0.25, 2.5)::numeric, 2) AS score,
          s.summary AS manual_summary
        FROM cases c
        LEFT JOIN td_summaries s ON s.td_name = c.td_name
        WHERE c.td_name IS NOT NULL
        GROUP BY c.td_name, s.summary
        ORDER BY accepted DESC, total DESC
      `),
      pool.query(`
        SELECT sphere, COUNT(*)::int AS count
        FROM cases
        WHERE status='accepted' AND sphere IS NOT NULL AND sphere <> ''
        GROUP BY sphere
        ORDER BY count DESC
      `),
    ]);
    res.json({ totals: totalsR.rows[0], byTd: byTdR.rows, bySphere: bySphereR.rows });
  } catch (e) {
    console.error('GET /cases/stats error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/cases/td-summary/:td_name — сохранить вывод аналитика по ТД
router.patch('/td-summary/:td_name', requireRole('admin', 'analyst'), async (req, res) => {
  const { summary } = req.body;
  const tdName = decodeURIComponent(req.params.td_name);
  try {
    await pool.query(`
      INSERT INTO td_summaries (td_name, summary, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (td_name) DO UPDATE SET summary = $2, updated_at = now()
    `, [tdName, summary ?? '']);
    res.json({ ok: true });
  } catch (e) {
    console.error('PATCH /cases/td-summary error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/cases — создать кейс (td only)
router.post('/', requireRole('td'), async (req, res) => {
  const { title, sphere, problem, problem_description, solution, npa_refs, measurable_effect } = req.body;
  if (!title) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const result = await pool.query(
      `INSERT INTO cases (title, sphere, problem, problem_description, solution, npa_refs, measurable_effect, td_name, submitted_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft') RETURNING *`,
      [title, sphere, problem, problem_description, solution, npa_refs,
       measurable_effect ? JSON.stringify(measurable_effect) : null,
       req.user.td_name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error('POST /cases error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/cases — список кейсов
router.get('/', async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'td') {
      query = `SELECT c.*, u.name AS author_name FROM cases c LEFT JOIN users u ON u.id = c.submitted_by WHERE c.submitted_by = $1 ORDER BY c.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT c.*, u.name AS author_name FROM cases c LEFT JOIN users u ON u.id = c.submitted_by ORDER BY c.created_at DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error('GET /cases error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/cases/:id — детали кейса
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS author_name FROM cases c LEFT JOIN users u ON u.id = c.submitted_by WHERE c.id = $1`,
      [req.params.id]
    );
    const c = result.rows[0];
    if (!c) return res.status(404).json({ error: 'Кейс не найден' });
    if (req.user.role === 'td' && c.submitted_by !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
    const comments = await pool.query(
      `SELECT cc.*, u.name AS author_name FROM case_comments cc LEFT JOIN users u ON u.id = cc.user_id WHERE cc.case_id = $1 ORDER BY cc.created_at ASC`,
      [req.params.id]
    );
    res.json({ ...c, comments: comments.rows });
  } catch (e) {
    console.error('GET /cases/:id error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/cases/:id/status — сменить статус (admin/analyst)
router.patch('/:id/status', requireRole('admin', 'analyst'), async (req, res) => {
  const { status, analyst_comment } = req.body;
  const validStatuses = ['draft', 'pending', 'in_review', 'returned', 'accepted', 'rejected'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });
  try {
    const result = await pool.query(
      `UPDATE cases SET status = $1, analyst_comment = COALESCE($2, analyst_comment), updated_at = now() WHERE id = $3 RETURNING *`,
      [status, analyst_comment ?? null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Кейс не найден' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('PATCH /cases/:id/status error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/cases/:id/comments — добавить комментарий (viewer запрещено)
router.post('/:id/comments', requireRole('admin', 'analyst', 'td'), async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Текст комментария обязателен' });
  try {
    const caseCheck = await pool.query('SELECT submitted_by FROM cases WHERE id = $1', [req.params.id]);
    if (!caseCheck.rows[0]) return res.status(404).json({ error: 'Кейс не найден' });
    if (req.user.role === 'td' && caseCheck.rows[0].submitted_by !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
    const result = await pool.query(
      `INSERT INTO case_comments (case_id, user_id, text) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, text.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error('POST /cases/:id/comments error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
