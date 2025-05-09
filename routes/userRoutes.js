import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' });
}

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getUserProfiles
} from '../controllers/userController.js';

const router = express.Router();

// Todas las rutas requieren ser admin
router.use(authenticateToken, adminMiddleware);

// Rutas de usuarios
router.get('/', getAllUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

// Obtener perfiles de un usuario
router.get('/:id/profiles', getUserProfiles);

export default router;