import axios from 'axios';
import Game from '../models/Game.js';

let catalog = [];
let refreshedAt = 0;
let refresh;

async function loadCatalog() {
  if (Date.now() - refreshedAt < 15 * 60_000) return catalog;
  refresh ??= axios.get('https://www.freetogame.com/api/games', {
    timeout: 8000, maxRedirects: 0, maxContentLength: 2_000_000,
  }).then(({ data }) => {
    if (!Array.isArray(data)) throw new Error('Respuesta inesperada');
    const valid = data.filter(game => Number.isSafeInteger(game.id) &&
      game.id > 0 && game.id < 1_000_000 && typeof game.title === 'string');
    if (!valid.length) throw new Error('Catálogo vacío');
    catalog = valid;
    refreshedAt = Date.now();
    return catalog;
  }).catch(() => {
    if (catalog.length && Date.now() - refreshedAt < 24 * 3600_000) return catalog;
    throw Object.assign(new Error('FreeToGame no está disponible en este momento.'), { status: 503 });
  }).finally(() => { refresh = null; });
  return refresh;
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export async function browseFreeToGame({ search, genre, platform, page, pageSize }) {
  const all = await loadCatalog();
  const term = search.trim().toLowerCase();
  const matches = all.filter(game => game.title.toLowerCase().includes(term) &&
    (!genre || game.genre === genre) && (!platform || game.platform === platform));
  const offset = (page - 1) * pageSize;
  const games = await Promise.all(matches.slice(offset, offset + pageSize).map(game => {
    // Reserve a distinct range in the legacy unique index. Favorites use MongoDB IDs.
    const rawgId = -1_000_000_000_000 - game.id;
    const date = Date.parse(game.release_date);
    return Game.findOneAndUpdate({ rawgId }, { $set: {
      freeToGameId: game.id,
      name: game.title,
      backgroundImage: httpsUrl(game.thumbnail) || '/covers/fallback.svg',
      website: httpsUrl(game.game_url),
      description: game.short_description || 'Descripción no disponible.',
      releaseDate: Number.isFinite(date) ? new Date(date) : null,
      ageRating: 'M',
      genres: game.genre ? [game.genre] : [],
      platforms: game.platform ? [game.platform] : [],
    } }, { upsert: true, new: true });
  }));
  return { total: matches.length, games, source: 'freetogame' };
}
