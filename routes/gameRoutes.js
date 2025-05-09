import express from 'express';
import {
  search,
  getGame,
  getFilteredGames,
  getPopularGames,
  getNewReleases,
  getGameRecommendations,
  validateAgeRating,
  createGame, // Nuevo
  updateGame, // Nuevo
  deleteGame,  // Nuevo
  getAllGames  // Nuevo
} from '../controllers/gameController.js';
import { authenticateToken } from '../middleware/auth.js';

// Middleware para verificar si el usuario es admin
function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' });
}

const router = express.Router();

// Rutas públicas
router.get('/search', search);
router.get('/filter', getFilteredGames);
router.get('/popular', getPopularGames);
router.get('/new-releases', getNewReleases);
// Endpoint público para obtener todos los juegos (debe ir antes de /:id)
router.get('/public', getAllGames);
router.get('/:id', getGame);

// Rutas protegidas
router.get('/recommendations/:profileId', authenticateToken, getGameRecommendations);
router.get('/validate-age/:gameId/:profileId', authenticateToken, validateAgeRating);

// CRUD de administración de juegos (solo admin)
router.post('/', authenticateToken, adminMiddleware, createGame);
router.put('/:id', authenticateToken, adminMiddleware, updateGame);
router.delete('/:id', authenticateToken, adminMiddleware, deleteGame);

// Obtener todos los juegos (para administración)
router.get('/', authenticateToken, adminMiddleware, getAllGames);

export default router;
