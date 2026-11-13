import axios from 'axios';
import { demoGames, demoSearch } from './demoCatalog.js';

const RAWG_API_URL = 'https://api.rawg.io/api';
async function requestRawg(path, params = {}) {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) throw Object.assign(new Error('RAWG requiere configuración.'), { status: 503 });
  try {
    const { data } = await axios.get(RAWG_API_URL + path, {
      params: { ...params, key },
      timeout: 8000,
      maxRedirects: 0,
    });
    return data;
  } catch (error) {
    const status = error.response?.status === 404 ? 404 : 503;
    throw Object.assign(new Error(status === 404 ? 'Juego no encontrado.' : 'RAWG no está disponible.'), { status });
  }
}

export async function browseRawg(query, page, pageSize) {
  const data = await requestRawg('/games', {
    search: query || undefined, page, page_size: Math.min(pageSize, 40),
    ordering: query ? undefined : '-added',
  });
  return { results: data.results, count: data.count };
}

export const searchGames = async (query, page = 1, pageSize = 20) => {
  if (process.env.DEMO_CATALOG === 'true') return demoSearch(query, page, pageSize);
  return browseRawg(query, page, pageSize);
};

export const getGameDetails = async (id) => {
  if (process.env.DEMO_CATALOG === 'true') {
    const game = demoGames.find(item => String(item.id) === String(id));
    if (!game) throw Object.assign(new Error('Juego no encontrado'), { status: 404 });
    return game;
  }
  if (!/^[1-9]\d{0,9}$/.test(String(id))) {
    throw Object.assign(new Error('ID de juego inválido.'), { status: 400 });
  }
  return requestRawg('/games/' + id);
};

export const getGamesByFilters = async (filters, page = 1, pageSize = 20) => {
  if (process.env.DEMO_CATALOG === 'true') return demoSearch('', page, pageSize, filters);
  return requestRawg('/games', { ...filters, page, page_size: Math.min(pageSize, 40) });
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
