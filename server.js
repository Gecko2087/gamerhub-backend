import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gamesRoutes from './routes/gameRoutes.js';
import profilesRoutes from './routes/profilesRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/games', gamesRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Puerto
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
