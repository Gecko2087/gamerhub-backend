import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const database = await MongoMemoryServer.create();
process.env.MONGODB_URI = database.getUri('gamerhub-test');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.DEMO_MODE = 'true';
process.env.DEMO_CATALOG = 'true';
process.env.RAWG_API_KEY = '';
let server;
try {
  const { default: app } = await import('../src/app.js');
  const { default: User } = await import('../models/User.js');
  const { default: Profile } = await import('../models/Profile.js');
  const { default: DemoBudget } = await import('../models/DemoBudget.js');
  server = await new Promise(resolve => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const call = async (path, { token, method = 'GET', body } = {}) => {
    const response = await fetch(base + path, { method,
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    let data; try { data = await response.json(); } catch { data = null; }
    return { response, data };
  };
  assert.equal((await call('/profiles')).response.status, 401);
  assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'No' } })).response.status, 403);
  const a = await call('/auth/demo', { method: 'POST' });
  const b = await call('/auth/demo', { method: 'POST' });
  assert.equal(a.response.status, 201); assert.equal(b.response.status, 201);
  assert.notEqual(a.data.user.id, b.data.user.id);
  const own = await call('/profiles', { token: a.data.token });
  const foreign = await call('/profiles', { token: b.data.token });
  assert.equal(own.data.length, 1); assert.equal(foreign.data.length, 1);
  assert.equal((await call('/profiles/user/' + b.data.user.id, { token: a.data.token })).response.status, 403);
  assert.equal((await call('/profiles/' + foreign.data[0]._id, { token: a.data.token, method: 'PUT', body: { name: 'Ajeno' } })).response.status, 403);
  const update = await call('/profiles/' + own.data[0]._id, { token: a.data.token, method: 'PUT', body: { name: 'Mi cambio' } });
  assert.equal(update.response.status, 200);
  assert.equal((await call('/profiles', { token: a.data.token })).data[0].name, 'Mi cambio');
  assert.equal((await Profile.findById(foreign.data[0]._id)).name, 'Mi perfil demo');
  const catalog = await call('/games/popular', { token: a.data.token });
  assert.equal(catalog.response.status, 200);
  const games = Array.isArray(catalog.data) ? catalog.data : catalog.data.results;
  assert.equal(games.length, 6);
  const gameId = games[0]._id;
  assert.equal((await call('/profiles/' + own.data[0]._id + '/watchlist', { token: a.data.token,
    method: 'POST', body: { gameId } })).response.status, 200);
  assert.equal((await call('/profiles/' + own.data[0]._id + '/watchlist', { token: a.data.token })).data[0]._id, gameId);
  assert.equal((await call('/profiles/' + own.data[0]._id + '/watchlist', { token: b.data.token })).response.status, 404);
  assert.equal((await call('/profiles/' + own.data[0]._id + '/watchlist', { token: b.data.token,
    method: 'POST', body: { gameId } })).response.status, 403);
  assert.equal((await call('/games/public?search=%28a%2B%29%2B%24', { token: a.data.token })).data.games.length, 0);
  for (const path of ['/games/search?query[]=a', '/games/public?genre[$ne]=x', '/games/popular?pageSize=0']) {
    assert.equal((await call(path, { token: a.data.token })).response.status, 400);
  }
  await User.updateOne({ _id: a.data.user.id }, { $set: { demoRequests: 250 } });
  assert.equal((await call('/profiles', { token: a.data.token })).response.status, 429);
  await User.updateOne({ _id: b.data.user.id }, { $set: { demoExpiresAt: new Date(0) } });
  assert.equal((await call('/profiles', { token: b.data.token })).response.status, 429);
  await DemoBudget.updateMany({}, { $set: { sessions: 100 } });
  assert.equal((await call('/auth/demo', { method: 'POST' })).response.status, 429);
  console.log('PASS: actual HTTP + MongoDB, separate JWT visitors, foreign profile denial, owner persistence, quotas and expiry.');
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await mongoose.disconnect();
  await database.stop();
}
