import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import multer from 'multer';

const router = Router();
router.use(authMiddleware);

const upload = multer({ storage: multer.memoryStorage() });

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', requireRole('admin', 'analyst', 'viewer'), async (req, res) => {
  const cycleId = req.query.cycle_id ? parseInt(req.query.cycle_id) : null;
  const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;
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
        WHERE ($1::int IS NULL OR cycle_id = $1)
          AND ($2::int IS NULL OR category_id = $2)
      `, [cycleId, categoryId]),
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
          AND ($1::int IS NULL OR c.cycle_id = $1)
          AND ($2::int IS NULL OR c.category_id = $2)
        GROUP BY c.td_name, s.summary
        ORDER BY accepted DESC, total DESC
      `, [cycleId, categoryId]),
      pool.query(`
        SELECT sphere, COUNT(*)::int AS count
        FROM cases
        WHERE status='accepted' AND sphere IS NOT NULL AND sphere <> ''
          AND ($1::int IS NULL OR cycle_id = $1)
          AND ($2::int IS NULL OR category_id = $2)
        GROUP BY sphere
        ORDER BY count DESC
      `, [cycleId, categoryId]),
    ]);
    res.json({ totals: totalsR.rows[0], byTd: byTdR.rows, bySphere: bySphereR.rows });
  } catch (e) {
    console.error('GET /cases/stats error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

router.get('/leaderboard', requireRole('admin', 'analyst', 'viewer', 'td'), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.td_name                                                                   AS region,
        COUNT(*)::int                                                               AS total,
        COUNT(*) FILTER (WHERE c.status = 'accepted')::int                         AS accepted,
        COUNT(*) FILTER (WHERE c.status = 'rejected')::int                         AS rejected,
        ROUND(COUNT(*) FILTER (WHERE c.status = 'accepted')::numeric
              / NULLIF(COUNT(*), 0) * 100)::int                                    AS pct,
        ROUND(COUNT(*) FILTER (WHERE c.status = 'accepted') * 0.25, 2)            AS score
      FROM cases c
      WHERE c.td_name IS NOT NULL
      GROUP BY c.td_name
      HAVING COUNT(*) > 0
      ORDER BY accepted DESC, pct DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (e) {
    console.error('GET /cases/leaderboard error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── TD summaries ──────────────────────────────────────────────────────────────

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

// ── Categories ────────────────────────────────────────────────────────────────

router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, sort_order FROM case_categories ORDER BY sort_order'
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /cases/categories error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── Cycles ────────────────────────────────────────────────────────────────────

// /cycles/active must be before /cycles/:id
router.get('/cycles/active', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, is_open, start_date, end_date FROM case_cycles WHERE is_open = true LIMIT 1'
    );
    res.json(rows[0] || null);
  } catch (e) {
    console.error('GET /cases/cycles/active error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/cycles', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, is_open, start_date, end_date FROM case_cycles ORDER BY id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /cases/cycles error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/cycles', requireRole('admin', 'analyst'), async (req, res) => {
  const { name, start_date, end_date } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO case_cycles (name, start_date, end_date) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), start_date || null, end_date || null]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error('POST /cases/cycles error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/cycles/:id/open', requireRole('admin', 'analyst'), async (req, res) => {
  try {
    await pool.query('UPDATE case_cycles SET is_open = false');
    const { rows } = await pool.query(
      'UPDATE case_cycles SET is_open = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Цикл не найден' });
    res.json(rows[0]);
  } catch (e) {
    console.error('PATCH /cases/cycles/:id/open error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.patch('/cycles/:id/close', requireRole('admin', 'analyst'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE case_cycles SET is_open = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Цикл не найден' });
    res.json(rows[0]);
  } catch (e) {
    console.error('PATCH /cases/cycles/:id/close error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── Attachment download — must be before /:id ─────────────────────────────────

router.get('/attachments/:attachmentId/download', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT filename, mimetype, data FROM case_attachments WHERE id = $1',
      [req.params.attachmentId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Файл не найден' });
    res.setHeader('Content-Type', rows[0].mimetype);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rows[0].filename)}`);
    res.send(rows[0].data);
  } catch (e) {
    console.error('GET /cases/attachments/:id/download error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── Cases CRUD ────────────────────────────────────────────────────────────────

router.post('/', requireRole('td'), async (req, res) => {
  const { title, sphere, problem, problem_description, solution, npa_refs, measurable_effect, category_id, due_date, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Название обязательно' });
  if (!category_id) return res.status(400).json({ error: 'Категория обязательна' });
  if (!due_date) return res.status(400).json({ error: 'Срок исполнения обязателен' });
  try {
    const { rows: cycleRows } = await pool.query(
      'SELECT id FROM case_cycles WHERE is_open = true LIMIT 1'
    );
    if (!cycleRows[0]) {
      return res.status(400).json({ error: 'Приём кейсов закрыт. Нет активного цикла.' });
    }
    const cycle_id = cycleRows[0].id;
    const result = await pool.query(
      `INSERT INTO cases
         (title, sphere, problem, problem_description, solution, npa_refs, measurable_effect,
          category_id, due_date, cycle_id, td_name, submitted_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        title, sphere || null, problem || null, problem_description || null,
        solution || null, npa_refs || null,
        measurable_effect ? JSON.stringify(measurable_effect) : null,
        category_id, due_date, cycle_id,
        req.user.td_name, req.user.id,
        status === 'draft' ? 'draft' : 'pending',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error('POST /cases error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/', async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'td') {
      query = `
        SELECT c.*, u.name AS author_name, cat.name AS category_name
        FROM cases c
        LEFT JOIN users u ON u.id = c.submitted_by
        LEFT JOIN case_categories cat ON cat.id = c.category_id
        WHERE c.submitted_by = $1 ORDER BY c.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `
        SELECT c.*, u.name AS author_name, cat.name AS category_name
        FROM cases c
        LEFT JOIN users u ON u.id = c.submitted_by
        LEFT JOIN case_categories cat ON cat.id = c.category_id
        ORDER BY c.created_at DESC`;
      params = [];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error('GET /cases error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS author_name,
              cat.name AS category_name,
              cy.name AS cycle_name
       FROM cases c
       LEFT JOIN users u ON u.id = c.submitted_by
       LEFT JOIN case_categories cat ON cat.id = c.category_id
       LEFT JOIN case_cycles cy ON cy.id = c.cycle_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    const c = result.rows[0];
    if (!c) return res.status(404).json({ error: 'Кейс не найден' });
    if (req.user.role === 'td' && c.submitted_by !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
    const [comments, attachments] = await Promise.all([
      pool.query(
        `SELECT cc.*, u.name AS author_name FROM case_comments cc
         LEFT JOIN users u ON u.id = cc.user_id
         WHERE cc.case_id = $1 ORDER BY cc.created_at ASC`,
        [req.params.id]
      ),
      pool.query(
        'SELECT id, filename, mimetype, size_bytes, created_at FROM case_attachments WHERE case_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      ),
    ]);
    res.json({ ...c, comments: comments.rows, attachments: attachments.rows });
  } catch (e) {
    console.error('GET /cases/:id error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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

// ── Attachments ───────────────────────────────────────────────────────────────

router.get('/:id/attachments', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, filename, mimetype, size_bytes, created_at FROM case_attachments WHERE case_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /cases/:id/attachments error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не прикреплён' });
  const { originalname, mimetype, size, buffer } = req.file;
  if (!ALLOWED_MIMETYPES.includes(mimetype)) {
    return res.status(400).json({ error: 'Разрешены только PDF, DOCX, XLSX' });
  }
  if (size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'Максимальный размер файла 10MB' });
  }
  try {
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM case_attachments WHERE case_id = $1',
      [req.params.id]
    );
    if (existing[0].cnt >= 5) {
      return res.status(400).json({ error: 'Максимум 5 файлов на кейс' });
    }
    const { rows } = await pool.query(
      `INSERT INTO case_attachments (case_id, filename, mimetype, size_bytes, data, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, filename, mimetype, size_bytes, created_at`,
      [req.params.id, originalname, mimetype, size, buffer, req.user.id]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error('POST /cases/:id/attachments error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ── Comments ──────────────────────────────────────────────────────────────────

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
