import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'debiuro-secret-key-2024';

export function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Нет доступа' });
    next();
  };
}

export { JWT_SECRET };
