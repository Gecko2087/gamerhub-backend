import axios from 'axios';

let token;
let tokenRequest;
const cache = new Map();
const timeout = 8000;

async function getToken(clientId, secret) {
  if (token?.expiresAt > Date.now()) return token.value;
  tokenRequest ??= axios.post('https://id.twitch.tv/oauth2/token', new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: 'client_credentials',
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout, maxRedirects: 0,
  }).then(({ data }) => {
    token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return token.value;
  }).finally(() => { tokenRequest = null; });
  return tokenRequest;
}

export async function browseIgdb(search, page, pageSize) {
  const clientId = process.env.IGDB_CLIENT_ID?.trim();
  const secret = process.env.IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !secret) {
    throw Object.assign(new Error('IGDB requiere configuración.'), { status: 503 });
  }
  const size = Math.min(40, Math.max(1, Number(pageSize) || 20));
  const offset = (Math.min(100, Math.max(1, Number(page) || 1)) - 1) * size;
  const query = String(search ?? '').trim().replace(/[\\\";\u0000-\u001f]/g, ' ').slice(0, 120);
  const key = JSON.stringify([query, offset, size]);
  const previous = cache.get(key);
  if (previous?.freshUntil > Date.now()) return previous.result;
  const fields = 'fields name,summary,cover.image_id,genres.name,platforms.name,first_release_date,rating,url;';
  const filter = query ? `search "${query}";` : 'sort total_rating_count desc;';
  const body = `${fields} ${filter} where cover != null; limit ${size + 1}; offset ${offset};`;
  try {
    const accessToken = await getToken(clientId, secret);
    const { data } = await axios.post('https://api.igdb.com/v4/games', body, {
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'text/plain' },
      timeout, maxRedirects: 0,
    });
    if (!Array.isArray(data)) throw new Error('Respuesta inesperada');
    const result = { games: data.slice(0, size), hasNext: data.length > size };
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(key, { result, freshUntil: Date.now() + 300000, staleUntil: Date.now() + 3600000 });
    return result;
  } catch (error) {
    if (error.response?.status === 401) token = undefined;
    if (previous?.staleUntil > Date.now()) return previous.result;
    throw Object.assign(new Error('IGDB no está disponible en este momento.'), { status: 503 });
  }
}
