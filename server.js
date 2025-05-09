import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gamesRoutes from './routes/games.js';
import watchlistRoutes from './routes/watchlist.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/games', gamesRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Puerto
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
