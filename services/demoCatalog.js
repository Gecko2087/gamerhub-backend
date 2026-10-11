const names = ['Orbit Runner', 'Forest Signals', 'Neon District', 'Deep Horizon', 'Pixel Kingdom', 'Solar Rally'];
export const demoGames = names.map((name, index) => ({
  id: 91001 + index, name, slug: name.toLowerCase().replaceAll(' ', '-'),
  background_image: 'https://gecko2087.github.io/portfolio/favicon.svg',
  description_raw: 'Juego ficticio del catálogo de demostración. Los perfiles y favoritos se guardan en MongoDB.',
  released: '2026-01-01', rating: 4 + index / 10,
  esrb_rating: { name: index % 2 ? 'Teen' : 'Everyone' },
  genres: [{ id: index % 2 ? 3 : 4, name: index % 2 ? 'Adventure' : 'Action' }],
  platforms: [{ platform: { id: 4, name: 'PC' } }],
}));
export function demoSearch(query = '', page = 1, pageSize = 20, filters = {}) {
  const search = String(query).slice(0, 160).toLowerCase();
  const selected = demoGames.filter(game => game.name.toLowerCase().includes(search) &&
    (!filters.genres || game.genres.some(genre => String(genre.id) === String(filters.genres))));
  const safePage = Math.max(1, Math.min(100, Number(page) || 1));
  const safeSize = Math.max(1, Math.min(40, Number(pageSize) || 20));
  return { count: selected.length, next: null, previous: null,
    results: selected.slice((safePage - 1) * safeSize, safePage * safeSize), demo: true };
}
