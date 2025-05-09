import express from 'express';
import {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  getUserProfiles,
  exportWatchlistReport
} from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas básicas de perfiles
router.get('/', getProfiles);
router.get('/user/:userId', getUserProfiles);
router.post('/', createProfile);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);

// Rutas de watchlist (ahora manejadas por profileController)
router.get('/:profileId/watchlist', getWatchlist);
router.post('/:profileId/watchlist', addToWatchlist);
router.delete('/:profileId/watchlist/:gameId', removeFromWatchlist);

// Ruta para exportar el reporte de watchlist en CSV, solo accesible para admin
router.get('/export/watchlist-report', exportWatchlistReport);

export default router;
