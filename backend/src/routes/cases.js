import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

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

// POST /api/cases/:id/comments — добавить комментарий
router.post('/:id/comments', async (req, res) => {
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
