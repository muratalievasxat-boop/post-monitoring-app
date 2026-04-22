import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { TD_LIST } from '../main.js';

const router = Router();
router.use(authMiddleware, requireRole('admin'));

// GET /api/users
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, td_name, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (e) {
    console.error('GET /users error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/users/td-list
router.get('/td-list', (_req, res) => {
  res.json(TD_LIST);
});

// POST /api/users
router.post('/', async (req, res) => {
  const { email, password, name, role, td_name } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name, role обязательны' });
  }
  if (!['admin', 'analyst', 'td'].includes(role)) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }
  if (role === 'td' && !td_name) {
    return res.status(400).json({ error: 'Для роли ТД укажите территориальный департамент' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, td_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, td_name, created_at`,
      [email.toLowerCase().trim(), hash, name.trim(), role, td_name ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    console.error('POST /users error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  const { name, email, password, role, td_name } = req.body;
  try {
    const current = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });

    const updates = [];
    const values = [];
    let idx = 1;
    if (name)     { updates.push(`name = $${idx++}`);          values.push(name.trim()); }
    if (email)    { updates.push(`email = $${idx++}`);         values.push(email.toLowerCase().trim()); }
    if (role)     { updates.push(`role = $${idx++}`);          values.push(role); }
    if (td_name !== undefined) { updates.push(`td_name = $${idx++}`); values.push(td_name || null); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }
    if (!updates.length) return res.status(400).json({ error: 'Нечего обновлять' });

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role, td_name, created_at`,
      values
    );
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email уже занят' });
    console.error('PATCH /users/:id error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ ok: true, deleted: result.rows[0] });
  } catch (e) {
    console.error('DELETE /users/:id error:', e.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
