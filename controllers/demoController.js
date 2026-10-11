import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import DemoBudget from '../models/DemoBudget.js';
import Game from '../models/Game.js';
import { demoGames } from '../services/demoCatalog.js';

export async function startDemo(req, res, next) {
  if (process.env.DEMO_MODE !== 'true') return res.sendStatus(404);
  try {
    const now = new Date();
    const id = now.toISOString().slice(0, 10);
    await DemoBudget.updateOne({ _id: id }, { $setOnInsert: { sessions: 0 } }, { upsert: true });
    const slot = await DemoBudget.findOneAndUpdate({ _id: id, sessions: { $lt: 100 } },
      { $inc: { sessions: 1 } }, { new: true });
    if (!slot) return res.status(429).json({ error: 'La demo alcanzó su cupo diario.' });
    if (process.env.DEMO_CATALOG === 'true') {
      for (const game of demoGames) {
        await Game.updateOne({ rawgId: game.id }, { $setOnInsert: {
          rawgId: game.id, name: game.name, backgroundImage: game.background_image,
          description: game.description_raw, platforms: ['PC'], genres: game.genres.map(genre => genre.name),
          rating: game.rating, ageRating: game.esrb_rating.name === 'Everyone' ? 'E' : 'T',
          releaseDate: new Date(game.released),
        } }, { upsert: true });
      }
    }
    const expired = await User.find({ demoExpiresAt: { $lt: now } }).select('_id').limit(100);
    await Profile.deleteMany({ userId: { $in: expired.map(user => user._id) } });
    await User.deleteMany({ _id: { $in: expired.map(user => user._id) }, demoExpiresAt: { $lt: now } });
    const user = await User.create({ name: 'Visitante demo', email: randomBytes(16).toString('hex') + '@example.com',
      password: randomBytes(32).toString('hex'), role: 'user', demoExpiresAt: new Date(now.getTime() + 3600000) });
    await Profile.create({ userId: user._id, name: 'Mi perfil demo', allowedRating: 'ADULTS' });
    const token = jwt.sign({ userId: user._id.toString(), role: 'user', demo: true }, process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' });
    return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: 'user' },
      expiresAt: user.demoExpiresAt });
  } catch (error) { next(error); }
}
