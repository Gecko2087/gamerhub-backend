import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../controllers/profileController.js', import.meta.url), 'utf8');
async function controller({ records = [{ name: 'Private profile', watchlist: ['fictional-game'] }], failed = false } = {}) {
  const reads = [];
  const imports = {
    '../models/Profile.js': { default: { find: async query => {
      reads.push(query); if (failed) throw new Error('DB unavailable'); return records;
    } } },
    '../models/Game.js': { default: {} }, '../models/User.js': { default: {} },
    '../services/rawgService.js': { getGameDetails() { throw new Error('External services forbidden'); } },
    'json2csv': { Parser: class {} },
  };
  const context = vm.createContext({ console: { error() {} } }, { codeGeneration: { strings: false, wasm: false } });
  const module = new vm.SourceTextModule(source, { context, importModuleDynamically() { throw new Error('Unexpected import'); } });
  await module.link(name => {
    assert.ok(name in imports, 'Unexpected dependency: ' + name);
    const values = imports[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return { handler: module.namespace.getUserProfiles, reads, module };
}
async function invoke(candidate, actor, requested, role = 'user') {
  let status = 200, body;
  const response = { status(value) { status = value; return response; }, json(value) { body = value; } };
  await candidate.handler({ user: { userId: actor, role }, params: { userId: requested } }, response);
  return { status, body };
}
const own = '0123456789abcdef01234567', other = 'fedcba9876543210fedcba98';
test('foreign profiles are denied before any database read, including uppercase representation', async () => {
  for (const target of [other, other.toUpperCase()]) {
    const candidate = await controller();
    assert.equal((await invoke(candidate, own, target)).status, 403);
    assert.equal(candidate.reads.length, 0);
  }
});
test('own profile and equivalent ObjectId representation retain the response', async () => {
  for (const target of [own, own.toUpperCase()]) {
    const candidate = await controller(); const result = await invoke(candidate, own, target);
    assert.equal(result.status, 200); assert.equal(result.body[0].name, 'Private profile');
    assert.equal(candidate.reads[0].userId, target);
  }
});
test('administrators retain their cross-user workflow', async () => {
  const candidate = await controller();
  assert.equal((await invoke(candidate, own, other, 'admin')).status, 200);
  assert.equal(candidate.reads[0].userId, other);
});
test('authorized empty lists and database failures keep their existing semantics', async () => {
  const empty = await controller({ records: [] });
  assert.equal((await invoke(empty, own, own)).body.length, 0);
  const failed = await controller({ failed: true });
  assert.equal((await invoke(failed, own, own)).status, 500);
});
