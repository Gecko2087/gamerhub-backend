import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function demoBoundary(req, res, next) {
  if (process.env.DEMO_MODE !== 'true') return next();
  res.set('Cache-Control', 'private, no-store');
  if (req.path === '/auth/demo' && req.method === 'POST') return next();
  if (['/auth/login', '/auth/register'].includes(req.path)) {
    return res.status(403).json({ error: 'Iniciá un espacio de demostración.' });
  }
  const token = req.get('authorization')?.match(/^Bearer ([^ ]+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'Iniciá tu espacio de demostración.' });
  let actor;
  try { actor = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ error: 'Tu sesión venció.' }); }
  if (!actor.demo || actor.role !== 'user') return res.status(403).json({ error: 'Sesión no habilitada para la demo.' });
  try {
    const allowed = await User.findOneAndUpdate({ _id: actor.userId, role: 'user',
      demoExpiresAt: { $gt: new Date() }, demoRequests: { $lt: 250 } }, { $inc: { demoRequests: 1 } }, { new: true });
    if (!allowed) return res.status(429).json({ error: 'Tu espacio venció o alcanzó su límite.' });
    req.user = actor;
    return next();
  } catch (error) { next(error); }
}
