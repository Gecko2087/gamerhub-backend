import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connect from '../config/db.js';
import authRoutes from '../routes/authRoutes.js';
import profilesRoutes from '../routes/profilesRoutes.js';
import gameRoutes from '../routes/gameRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import errorHandler from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { importPopularGames } from '../controllers/gameController.js';
import { demoBoundary } from '../middleware/demo.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://gamerhub-frontend.netlify.app',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express.json({ limit: '24kb' }));
app.get('/api/health', (req, res) => res.json({ service: 'gamerhub', status: 'ok' }));
app.use('/api', async (req, res, next) => {
  try { await connect(); next(); } catch { res.status(503).json({ error: 'La base de datos no está disponible.' }); }
});
app.use('/api', demoBoundary);

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes); // Las rutas de watchlist ahora están aquí
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/watchlist', watchlistRoutes); // Eliminado

app.post('/api/games/import-popular', authenticateToken, async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' });
    }
    const cantidad = parseInt(req.body.cantidad) || 100;
    await importPopularGames(cantidad);
    res.json({ message: `Juegos populares importados correctamente (${cantidad})` });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

export default app;
