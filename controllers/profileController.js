import Profile from '../models/Profile.js';
import Game from '../models/Game.js';
import User from '../models/User.js';
import { getGameDetails } from '../services/rawgService.js';
import { Parser as Json2csvParser } from 'json2csv';

export const getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ userId: req.user.userId });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfiles' });
  }
};

export const getUserProfiles = async (req, res) => {
  try {
    const { userId } = req.params;
    const profiles = await Profile.find({ userId: userId });
    res.json(profiles);
  } catch (error) {
    console.error('Error al obtener perfiles del usuario:', error);
    res.status(500).json({ error: 'Error al obtener perfiles del usuario' });
  }
};

export const createProfile = async (req, res) => {
  try {
    const { name, allowedRating, userId } = req.body;
    
    // Si es admin y proporciona un userId, crear perfil para ese usuario
    // Si no, crear perfil para el usuario autenticado
    const profileOwner = req.user.role === 'admin' && userId ? userId : req.user.userId;
    
    const profile = new Profile({
      userId: profileOwner,
      name,
      allowedRating
    });
    
    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Error al crear perfil' });
  }
};

// Solo el usuario dueño del perfil, el owner o el admin pueden modificar/eliminar el perfil
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, allowedRating, preferences } = req.body;

    // Buscar el perfil
    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    // Permisos: admin puede todo, owner/user solo si es su perfil
    if (
      req.user.role !== 'admin' &&
      String(profile.userId) !== String(req.user.userId)
    ) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este perfil' });
    }

    profile.name = name;
    profile.allowedRating = allowedRating;
    profile.preferences = preferences;
    await profile.save();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    // Verificar permisos: el admin puede eliminar cualquier perfil
    // El usuario normal solo puede eliminar sus propios perfiles
    if (
      req.user.role !== 'admin' &&
      String(profile.userId) !== String(req.user.userId)
    ) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este perfil' });
    }

    await profile.deleteOne();
    res.json({ message: 'Perfil eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar perfil:', error);
    res.status(500).json({ error: 'Error al eliminar perfil' });
  }
};

export const addToWatchlist = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: 'Se requiere el ID del juego' });
    }
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    // Verificar que el usuario autenticado sea dueño del perfil
    if (profile.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este perfil' });
    }
    // Verificar si el juego ya está en la lista
    if (profile.watchlist.includes(gameId)) {
      return res.status(400).json({ error: 'El juego ya está en la lista de seguimiento' });
    }
    // Validar que el juego exista en la base de datos local
    const gameExists = await Game.findById(gameId);
    if (!gameExists) {
      return res.status(404).json({ error: 'Juego no encontrado en la base de datos' });
    }
    profile.watchlist.push(gameId);
    await profile.save();
    res.json({ message: 'Juego agregado a la lista de seguimiento' });
  } catch (error) {
    console.error('Error al agregar a la lista de seguimiento:', error);
    res.status(500).json({ error: 'Error al agregar a la lista de seguimiento' });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const { profileId, gameId } = req.params;
    const profile = await Profile.findOne({ _id: profileId, userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    
    // Convertir ambos a string para asegurar una comparación correcta
    profile.watchlist = profile.watchlist.filter(id => id.toString() !== gameId.toString());
    await profile.save();
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar de watchlist' });
  }
};

export const getWatchlist = async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await Profile.findOne({ _id: profileId, userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    if (!profile.watchlist || profile.watchlist.length === 0) {
      return res.json([]);
    }
    // Buscar los juegos en la base de datos local
    const games = await Game.find({ _id: { $in: profile.watchlist } });
    res.json(games);
  } catch (error) {
    console.error('Error general en getWatchlist:', error);
    res.status(500).json({ error: 'Error al obtener watchlist' });
  }
};

export const exportWatchlistReport = async (req, res) => {
  try {
    // Solo admin puede exportar
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden exportar reportes' });
    }
    // Traer todos los perfiles y popular user y juegos
    const profiles = await Profile.find().populate('userId');
    let reportRows = [];
    for (const profile of profiles) {
      if (!profile.watchlist || profile.watchlist.length === 0) continue;
      // Traer los juegos de la watchlist
      const games = await Game.find({ _id: { $in: profile.watchlist } });
      for (const game of games) {
        reportRows.push({
          perfil: profile.name,
          usuario: profile.userId?.name || '',
          email: profile.userId?.email || '',
          juego: game.name,
          fecha_agregado: profile.createdAt ? profile.createdAt.toISOString().split('T')[0] : ''
        });
      }
    }
    // Generar CSV
    const fields = ['perfil', 'usuario', 'email', 'juego', 'fecha_agregado'];
    const json2csv = new Json2csvParser({ fields });
    const csv = json2csv.parse(reportRows);
    res.header('Content-Type', 'text/csv');
    res.attachment('reporte_watchlist.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Error al exportar reporte de watchlist:', error);
    res.status(500).json({ error: 'Error al exportar reporte de watchlist' });
  }
};
