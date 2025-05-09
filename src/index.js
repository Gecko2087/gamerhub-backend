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

const app = express();
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json());

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

connect();
app.listen(process.env.PORT || 4000, () =>
  console.log(`🚀  API en http://localhost:${process.env.PORT || 4000}`)
);