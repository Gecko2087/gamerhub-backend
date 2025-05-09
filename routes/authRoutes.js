import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const r = Router();
r.post('/register', register);
r.post('/login', login);

// Endpoint para obtener el usuario autenticado
r.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Asegurarnos de que enviamos todos los datos necesarios del usuario
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Error al obtener usuario autenticado:', error);
    res.status(500).json({ error: 'Error al obtener usuario autenticado' });
  }
});

export default r;
