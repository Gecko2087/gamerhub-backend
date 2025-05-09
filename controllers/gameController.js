import { searchGames, getGameDetails, getGamesByFilters } from '../services/rawgService.js';
import Game from '../models/Game.js';
import Profile from '../models/Profile.js';

// Función para mapear clasificaciones ESRB de RAWG a nuestro modelo
const mapEsrbRating = (rawgRating) => {
  if (!rawgRating) return 'E'; // Si no hay clasificación, asumir E (Everyone)
  
  const rating = rawgRating.toLowerCase();
  
  if (rating.includes('everyone') || rating === 'e' || rating === 'ec') return 'E';
  if (rating.includes('everyone 10+') || rating === 'e10+') return 'E10+';
  if (rating.includes('teen') || rating === 't') return 'T';
  if (rating.includes('mature') || rating === 'm') return 'M';
  if (rating.includes('adults only') || rating === 'ao') return 'AO';
  
  // Si no coincide con ninguno de los anteriores, clasificar como E por defecto
  return 'E';
};

// Función auxiliar para guardar juegos de RAWG en la base de datos
const saveGameFromRawg = async (rawgGame) => {
  try {
    // Comprobar si el juego ya existe en la base de datos por rawgId
    let existingGame = await Game.findOne({ rawgId: rawgGame.id });
    
    if (existingGame) {
      // El juego ya existe, no es necesario guardarlo nuevamente
      return existingGame;
    }
    
    // Mapear la clasificación ESRB de RAWG a nuestro modelo
    const mappedAgeRating = mapEsrbRating(rawgGame.esrb_rating?.name);
    
    // Crear un nuevo juego con los datos de RAWG
    const newGame = new Game({
      name: rawgGame.name,
      rawgId: rawgGame.id,
      backgroundImage: rawgGame.background_image || 'https://via.placeholder.com/600x400?text=Sin+imagen',
      releaseDate: rawgGame.released || new Date(),
      rating: rawgGame.rating || 0,
      ageRating: mappedAgeRating,
      description: rawgGame.description_raw || rawgGame.description || 'Sin descripción.',
      platforms: rawgGame.platforms?.map(p => p.platform.name) || ['Desconocido'],
      genres: rawgGame.genres?.map(g => g.name) || ['Desconocido'],
      watchlist: { profiles: [] }
    });
    
    await newGame.save();
    return newGame;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicado: solo advertencia breve
      console.warn(`Juego duplicado ignorado (rawgId: ${rawgGame.id})`);
      return await Game.findOne({ rawgId: rawgGame.id });
    }
    console.error('Error al guardar juego de RAWG:', error);
    // Retornamos el juego original de RAWG si no se pudo guardar
    return rawgGame;
  }
};

// Función auxiliar para guardar múltiples juegos de RAWG en la base de datos
const saveGamesFromRawg = async (rawgGames) => {
  try {
    // Para cada juego en la respuesta de RAWG
    const savedGames = [];
    
    for (const game of rawgGames) {
      // Comprobar si el juego ya existe
      let existingGame = await Game.findOne({ rawgId: game.id });
      
      if (existingGame) {
        // Si ya existe, lo añadimos a la lista de resultados
        savedGames.push(existingGame);
      } else {
        // Mapear la clasificación ESRB de RAWG a nuestro modelo
        const mappedAgeRating = mapEsrbRating(game.esrb_rating?.name);
        
        // Si no existe, lo creamos
        const newGame = new Game({
          name: game.name,
          rawgId: game.id,
          backgroundImage: game.background_image || 'https://via.placeholder.com/600x400?text=Sin+imagen',
          releaseDate: game.released || new Date(),
          rating: game.rating || 0,
          ageRating: mappedAgeRating,
          description: game.description_raw || game.description || 'Sin descripción.',
          platforms: game.platforms?.map(p => p.platform.name) || ['Desconocido'],
          genres: game.genres?.map(g => g.name) || ['Desconocido'],
          watchlist: { profiles: [] }
        });
        
        try {
          await newGame.save();
          savedGames.push(newGame);
        } catch (saveError) {
          console.error('Error al guardar juego:', saveError);
          savedGames.push(game); // Usamos el original si hay error
        }
      }
    }
    
    return {
      count: rawgGames.length,
      results: savedGames
    };
  } catch (error) {
    console.error('Error al guardar juegos de RAWG:', error);
    // Retornamos los juegos originales de RAWG si no se pudieron guardar
    return {
      count: rawgGames.length,
      results: rawgGames
    };
  }
};

export const search = async (req, res) => {
  try {
    const { query, page = 1, pageSize = 20 } = req.query;
    
    // Primero buscar en nuestra base de datos
    const dbResults = await Game.find({ 
      name: { $regex: query, $options: 'i' } 
    })
    .limit(parseInt(pageSize))
    .skip((parseInt(page) - 1) * parseInt(pageSize));
    
    const count = await Game.countDocuments({ name: { $regex: query, $options: 'i' } });
    
    // Si tenemos suficientes resultados en la base de datos, los devolvemos
    if (count >= parseInt(pageSize)) {
      return res.json({
        count,
        results: dbResults
      });
    }
    
    // Si no tenemos suficientes, consultamos a RAWG
    const rawgResults = await searchGames(query, parseInt(page), parseInt(pageSize));
    
    // Guardamos los juegos de RAWG en la base de datos
    const savedResults = await saveGamesFromRawg(rawgResults.results);
    
    res.json(savedResults);
  } catch (error) {
    console.error('Error en búsqueda de juegos:', error);
    res.status(500).json({ error: 'Error searching games' });
  }
};

export const getGame = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Se requiere el ID del juego' });
    }

    let game = null;
    // Buscar primero por _id de MongoDB si es un ObjectId válido
    if (/^[a-fA-F0-9]{24}$/.test(id)) {
      game = await Game.findById(id);
    }

    // Si no se encontró por _id, intentar buscar por rawgId (numérico)
    if (!game && !isNaN(parseInt(id))) {
      game = await Game.findOne({ rawgId: parseInt(id) });
    }

    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    res.json(game);
  } catch (error) {
    console.error('Error getting game details:', error);
    if (error.message === 'Juego no encontrado') {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    res.status(500).json({ error: 'Error al obtener detalles del juego' });
  }
};

export const getFilteredGames = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, ...filters } = req.query;
    const results = await getGamesByFilters(filters, parseInt(page), parseInt(pageSize));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error filtering games' });
  }
};

export const getPopularGames = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    
    // Primero buscar en nuestra base de datos (ordenados por rating)
    const dbResults = await Game.find()
      .sort({ rating: -1 })
      .limit(parseInt(pageSize))
      .skip((parseInt(page) - 1) * parseInt(pageSize));
    
    const count = await Game.countDocuments();
    
    // Si tenemos suficientes resultados en la base de datos, los devolvemos
    if (dbResults.length >= parseInt(pageSize)) {
      return res.json({
        count,
        results: dbResults
      });
    }
    
    // Si no tenemos suficientes, consultamos a RAWG
    const rawgResults = await getGamesByFilters(
      { ordering: '-rating' },
      parseInt(page),
      parseInt(pageSize)
    );
    
    // Guardamos los juegos de RAWG en la base de datos
    const savedResults = await saveGamesFromRawg(rawgResults.results);
    
    res.json(savedResults);
  } catch (error) {
    console.error('Error getting popular games:', error);
    res.status(500).json({ error: 'Error getting popular games' });
  }
};

export const getNewReleases = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const results = await getGamesByFilters(
      { ordering: '-released' },
      parseInt(page),
      parseInt(pageSize)
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error getting new releases' });
  }
};

export const getGameRecommendations = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    // Obtener juegos populares como recomendaciones por ahora
    const results = await getGamesByFilters(
      { ordering: '-rating' },
      parseInt(page),
      parseInt(pageSize)
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    res.status(500).json({ error: 'Error al obtener recomendaciones' });
  }
};

export const validateAgeRating = async (req, res) => {
  try {
    const { gameId, profileId } = req.params;
    
    if (!gameId || !profileId) {
      return res.status(400).json({ error: 'Se requieren los IDs del juego y del perfil' });
    }

    const game = await getGameDetails(gameId);
    const gameRating = game.esrb_rating?.name?.toUpperCase() || '';
    
    res.json({ 
      gameRating,
      isAllowed: true // Por ahora siempre permitido, se validará en el frontend
    });
  } catch (error) {
    console.error('Error al validar edad:', error);
    res.status(500).json({ error: 'Error al validar edad' });
  }
};

// CRUD de administración de juegos (solo admin)
export const createGame = async (req, res) => {
  try {
    const {
      name,
      rawgId,
      backgroundImage,
      releaseDate,
      rating,
      ageRating,
      description,
      platforms,
      genres
    } = req.body;

    // Validación básica
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    // Si se provee rawgId, evitar duplicados
    if (rawgId) {
      const exists = await Game.findOne({ rawgId });
      if (exists) return res.status(400).json({ error: 'Ya existe un juego con ese rawgId' });
    }

    // Normalizar platforms y genres a array
    const platformsArr = Array.isArray(platforms)
      ? platforms
      : (typeof platforms === 'string' && platforms.trim() !== '' ? platforms.split(',').map(s => s.trim()) : []);
    const genresArr = Array.isArray(genres)
      ? genres
      : (typeof genres === 'string' && genres.trim() !== '' ? genres.split(',').map(s => s.trim()) : []);

    const newGame = new Game({
      name,
      rawgId,
      backgroundImage: backgroundImage || 'https://via.placeholder.com/600x400?text=Sin+imagen',
      releaseDate: releaseDate || new Date(),
      rating: rating || 0,
      ageRating: ageRating || 'E',
      description: description || '',
      platforms: platformsArr,
      genres: genresArr,
      watchlist: { profiles: [] }
    });
    await newGame.save();
    res.status(201).json(newGame);
  } catch (error) {
    // Devuelve el mensaje real del error para depuración
    res.status(500).json({ error: error.message || 'Error al crear el juego' });
  }
};

export const updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const game = await Game.findById(id);
    if (!game) return res.status(404).json({ error: 'Juego no encontrado' });
    Object.assign(game, updates);
    await game.save();
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el juego' });
  }
};

export const deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await Game.findById(id);
    if (!game) return res.status(404).json({ error: 'Juego no encontrado' });
    await game.deleteOne();
    res.json({ message: 'Juego eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el juego' });
  }
};

// Obtener todos los juegos con filtros, búsqueda y paginación
export const getAllGames = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '', genre = '', platform = '' } = req.query;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (genre) {
      query.genres = genre;
    }
    if (platform) {
      query.platforms = platform;
    }
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const total = await Game.countDocuments(query);
    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));
    res.json({ total, games });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener todos los juegos' });
  }
};

// Importar juegos populares desde RAWG (para endpoint de admin)
export const importPopularGames = async (cantidad = 100) => {
  const { searchGames, getGameDetails } = await import('../services/rawgService.js');
  let nuevosImportados = 0;
  let page = 1;
  const pageSize = 40; // RAWG limita a 40 por página
  const rawgIdsExistentes = new Set((await Game.find({}, { rawgId: 1 })).map(g => g.rawgId));
  const intentados = new Set();
  while (nuevosImportados < cantidad) {
    const toFetch = pageSize;
    const data = await searchGames('', page, toFetch);
    if (!data.results || data.results.length === 0) break;
    for (const g of data.results) {
      if (nuevosImportados >= cantidad) break;
      if (!g.id || rawgIdsExistentes.has(g.id) || intentados.has(g.id)) continue;
      let details;
      try {
        details = await getGameDetails(g.id);
      } catch (e) {
        details = g;
      }
      // Verificar de nuevo por si otro proceso lo agregó mientras tanto
      const yaExiste = await Game.findOne({ rawgId: details.id });
      if (!yaExiste) {
        await saveGameFromRawg(details);
        nuevosImportados++;
        rawgIdsExistentes.add(details.id);
      }
      intentados.add(g.id);
    }
    if (!data.next) break;
    page++;
  }
};
