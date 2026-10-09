import axios from 'axios';
import { demoGames, demoSearch } from './demoCatalog.js';

const RAWG_API_URL = 'https://api.rawg.io/api';

export const searchGames = async (query, page = 1, pageSize = 20) => {
  if (process.env.DEMO_CATALOG === 'true') return demoSearch(query, page, pageSize);
  const API_KEY = process.env.RAWG_API_KEY;
  try {
    const response = await axios.get(`${RAWG_API_URL}/games`, {
      params: {
        key: API_KEY,
        search: query,
        page,
        page_size: pageSize
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching games:', error);
    throw error;
  }
};

export const getGameDetails = async (id) => {
  if (process.env.DEMO_CATALOG === 'true') {
    const game = demoGames.find(item => String(item.id) === String(id));
    if (!game) throw Object.assign(new Error('Juego no encontrado'), { status: 404 });
    return game;
  }
  const API_KEY = process.env.RAWG_API_KEY;
  try {
    // Asegurarse de que el ID sea un número
    const gameId = parseInt(id);
    if (isNaN(gameId)) {
      throw new Error('ID de juego inválido');
    }

    const response = await axios.get(`${RAWG_API_URL}/games/${gameId}`, {
      params: {
        key: API_KEY
      }
    });

    if (!response.data) {
      throw new Error('No se encontraron detalles del juego');
    }

    return response.data;
  } catch (error) {
    console.error('Error getting game details:', error);
    if (error.response?.status === 404) {
      throw new Error('Juego no encontrado');
    }
    throw error;
  }
};

export const getGamesByFilters = async (filters, page = 1, pageSize = 20) => {
  if (process.env.DEMO_CATALOG === 'true') return demoSearch('', page, pageSize, filters);
  const API_KEY = process.env.RAWG_API_KEY;
  try {
    const response = await axios.get(`${RAWG_API_URL}/games`, {
      params: {
        ...filters,
        key: API_KEY,
        page,
        page_size: pageSize
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error filtering games:', error);
    throw error;
  }
};

export const syncGameWithRawg = async (rawgId) => {
  const { default: Game } = await import('../models/Game.js');
  const details = await getGameDetails(rawgId);

  // Normalización de clasificación ESRB a ageRating
  let ageRating = 'M'; // Valor por defecto si no hay info
  if (details.esrb_rating && details.esrb_rating.name) {
    const esrb = details.esrb_rating.name.toUpperCase();
    if (esrb.includes('EVERYONE 10')) ageRating = 'E10+';
    else if (esrb.includes('EVERYONE')) ageRating = 'E';
    else if (esrb.includes('TEEN')) ageRating = 'T';
    else if (esrb.includes('MATURE')) ageRating = 'M';
    else if (esrb.includes('ADULTS ONLY')) ageRating = 'AO';
  }

  // Guardar o actualizar el juego
  await Game.findOneAndUpdate(
    { rawgId: details.id },
    {
      rawgId: details.id,
      name: details.name,
      slug: details.slug,
      esrbRating: details.esrb_rating?.name || '',
      backgroundImage: details.background_image,
      rating: details.rating,
      released: details.released,
      platforms: details.platforms?.map(p => p.platform.name) || [],
      genres: details.genres?.map(g => g.name) || [],
      description: details.description_raw || details.description || '',
      website: details.website,
      ageRating,
      releaseDate: details.released,
      metacritic: details.metacritic,
      lastSynced: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
