import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../routes/authRoutes.js', import.meta.url), 'utf8');

async function loadRoutes(code = source) {
  const routes = [];
  let selected;
  let record = { _id: 'demo-id', name: 'Player', email: 'demo@example.invalid', role: 'user', password: 'never-return' };
  const register = () => {}, login = () => {}, authenticateToken = () => {};
  const router = { post: (path, ...handlers) => routes.push({ method: 'POST', path, handlers }), get: (path, ...handlers) => routes.push({ method: 'GET', path, handlers }) };
  const exports = new Map([
    ['express', { Router: () => router }],
    ['../controllers/authController.js', { register, login }],
    ['../middleware/auth.js', { authenticateToken }],
    ['../models/User.js', { default: { findById: id => { assert.equal(id, 'demo-id'); return { select: async fields => { selected = fields; return record; } }; } } }]
  ]);
  const context = vm.createContext({ console: { error() {} } }, { codeGeneration: { strings: false, wasm: false } });
  const mod = new vm.SourceTextModule(code, { context, importModuleDynamically: () => { throw new Error('Unexpected dynamic import'); } });
  await mod.link(specifier => {
    assert(exports.has(specifier), `Unexpected import: ${specifier}`);
    const values = exports.get(specifier);
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
  });
  await mod.evaluate({ timeout: 1000 });
  return { routes, register, login, authenticateToken, selected: () => selected, setRecord: value => { record = value; } };
}

test('import registers only the expected routes without ambient execution privileges', async () => {
  const result = await loadRoutes();
  assert.deepEqual(result.routes.map(({ method, path }) => [method, path]), [['POST', '/register'], ['POST', '/login'], ['GET', '/me']]);
  assert.equal(result.routes[0].handlers[0], result.register);
  assert.equal(result.routes[1].handlers[0], result.login);
  assert.equal(result.routes[2].handlers[0], result.authenticateToken);
});

test('me selects the current user and excludes the password from its response', async () => {
  const result = await loadRoutes();
  let body;
  await result.routes[2].handlers[1]({ user: { userId: 'demo-id' } }, { json: value => { body = value; } });
  assert.equal(result.selected(), '-password');
  assert.deepEqual(Object.keys(body).sort(), ['email', 'id', 'name', 'role']);
  assert.equal(body.id, 'demo-id');
});

test('me keeps a missing user as a 404', async () => {
  const result = await loadRoutes();
  result.setRecord(null);
  let status, body;
  const res = { status: value => { status = value; return res; }, json: value => { body = value; } };
  await result.routes[2].handlers[1]({ user: { userId: 'demo-id' } }, res);
  assert.equal(status, 404);
  assert.equal(body.error, 'Usuario no encontrado');
});

test('the restricted import check catches appended execution and unauthorized imports', async () => {
  await assert.rejects(loadRoutes(source + '\nprocess.exit(1);'), /process is not defined/);
  await assert.rejects(loadRoutes(source + '\nawait import("node:http");'), /Unexpected dynamic import/);
  await assert.rejects(loadRoutes(source + '\nimport { spawn } from "node:child_process";'), /Unexpected import/);
});
