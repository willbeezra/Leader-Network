import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';

// Run with Node 24. Real Hono handlers + SQLite SQL; no production bindings or network.
const temp = mkdtempSync(join(tmpdir(), 'leader-registration-'));
after(() => rmSync(temp, { recursive: true, force: true }));
await build({ stdin: { contents: "export { auth } from './src/routes/auth.ts'; export { default as app } from './src/index.tsx';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: join(temp, 'app.mjs'), logLevel: 'silent' });
const { auth, app } = await import(pathToFileURL(join(temp, 'app.mjs')));
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Network is forbidden in registration tests'); };
after(() => { globalThis.fetch = originalFetch; });

class LocalD1 {
  sqlite = new DatabaseSync(':memory:');
  beforeBatch;
  constructor() {
    for (const file of ['0001_initial_schema.sql', '0007_inscription_methods.sql', '0012_system_config.sql', '0041_kyc_demographics.sql', '0052_members_address_fields.sql']) {
      this.sqlite.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
    }
    this.sqlite.exec('PRAGMA foreign_keys=ON');
    assert.equal(this.sqlite.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  }
  prepare(sql) {
    const db = this.sqlite;
    return {
      sql, args: [],
      bind(...args) { this.args = args; return this; },
      async first() { return db.prepare(sql).get(...this.args) || null; },
      async all() { return { results: db.prepare(sql).all(...this.args) }; },
      async run() { const result = db.prepare(sql).run(...this.args); return { success: true, meta: { changes: Number(result.changes) } }; },
    };
  }
  async batch(statements) {
    if (this.beforeBatch) await this.beforeBatch();
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map(s => ({ success: true, meta: { changes: Number(this.sqlite.prepare(s.sql).run(...s.args).changes) } }));
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}
function fixture(t) {
  const DB = new LocalD1();
  t.after(() => DB.sqlite.close());
  seed(DB, 'sponsor', 'megalen');
  return { DB, JWT_SECRET: 'test-only-registration-secret-never-used-in-production' };
}
function seed(db, id, uid, license = 1) {
  db.sqlite.prepare(`INSERT INTO members(id,unique_id,email,password_hash,first_name,last_name,license_active) VALUES (?,?,?,'synthetic','Audit','Example',?)`).run(id, uid, id + '@example.invalid', license);
}
function body(overrides = {}) {
  return { first_name: ' New ', last_name: ' Member ', email: 'new@example.invalid', password: 'test-only-password', registration_method: 'M1', ...overrides };
}
async function post(env, data) {
  const response = await auth.request('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }, env);
  return { status: response.status, data: await response.json() };
}
async function get(env, path) {
  const response = await auth.request(path, {}, env);
  return { status: response.status, data: await response.json() };
}
function counts(db) {
  return Object.fromEntries(['members', 'wallets', 'holding_tank', 'notifications'].map(table => [table, db.sqlite.prepare(`SELECT count(*) n FROM ${table}`).get().n]));
}

test('referral and placement lookups accept historical UID case variants', async t => {
  const env = fixture(t);
  for (const uid of ['megalen', 'MEGALEN', 'Megalen']) {
    const sponsor = await get(env, '/sponsor/' + uid);
    assert.equal(sponsor.data.id, 'sponsor');
    const slot = await get(env, `/validate-slot?sponsor=${uid}&parent=${uid}&position=l`);
    assert.equal(slot.status, 200);
    assert.equal(slot.data.parent_id, 'sponsor');
    assert.equal(slot.data.position, 'L');
  }
});
test('ambiguous UID case collisions never choose an arbitrary account', async t => {
  const env = fixture(t); seed(env.DB, 'other', 'MEGALEN');
  for (const path of ['/sponsor/megalen', '/validate-slot?sponsor=megalen&position=L']) {
    const res = await get(env, path);
    assert.equal(res.status, 409); assert.equal(res.data.code, 'AMBIGUOUS_REFERRAL');
  }
});
test('lookup distinguishes absent sponsor, inactive license, absent parent and occupied slot', async t => {
  const env = fixture(t);
  assert.equal((await get(env, '/sponsor/missing')).data.reason, 'not_found');
  seed(env.DB, 'inactive', 'inactive', 0);
  assert.equal((await get(env, '/sponsor/inactive')).data.reason, 'no_license');
  assert.equal((await get(env, '/validate-slot?sponsor=inactive&position=L')).data.code, 'SPONSOR_NO_LICENSE');
  assert.equal((await get(env, '/validate-slot?sponsor=megalen&parent=missing&position=L')).data.code, 'INVALID_PARENT');
  seed(env.DB, 'child', 'child');
  env.DB.sqlite.exec("UPDATE members SET binary_parent_id='sponsor', binary_position='L' WHERE id='child'");
  assert.equal((await get(env, '/validate-slot?sponsor=megalen&position=L')).data.code, 'SLOT_TAKEN');
});
test('M1 without referral creates root sponsorship, wallet, holding entry and preserves profile fields', async t => {
  const env = fixture(t);
  const values = { phone: '+230 1234', country: 'Maurice', birth_date: '1990-02-28', nationality: 'Mauricienne', address: 'Example road', postal_code: '12345', city: 'Example city' };
  const result = await post(env, body(values));
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const member = env.DB.sqlite.prepare('SELECT * FROM members WHERE id=?').get(result.data.member.id);
  for (const [field, value] of Object.entries(values)) assert.equal(member[field], value);
  assert.equal(member.first_name, 'New');
  assert.equal(member.sponsor_id, 'root-system-000000000000000000000000');
  assert.equal(member.in_holding_tank, 1);
  assert.equal(counts(env.DB).holding_tank, 1);
  assert.ok(env.DB.sqlite.prepare('SELECT * FROM wallets WHERE member_id=?').get(member.id));
});
test('M3 preserves sponsor in member and holding tank', async t => {
  const env = fixture(t); const result = await post(env, body({ registration_method: 'M3', sponsor_id: 'sponsor' }));
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const member = env.DB.sqlite.prepare('SELECT * FROM members WHERE id=?').get(result.data.member.id);
  assert.equal(member.sponsor_id, 'sponsor'); assert.equal(member.binary_parent_id, null);
  assert.equal(env.DB.sqlite.prepare('SELECT sponsor_id FROM holding_tank WHERE member_id=?').get(member.id).sponsor_id, 'sponsor');
});
for (const position of ['L', 'R']) test(`M2 ${position} preserves distinct sponsor and binary parent`, async t => {
  const env = fixture(t); seed(env.DB, 'parent', 'parent');
  const result = await post(env, body({ registration_method: 'M2', sponsor_id: 'sponsor', binary_parent_id: 'parent', binary_position: position.toLowerCase() }));
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const member = env.DB.sqlite.prepare('SELECT * FROM members WHERE id=?').get(result.data.member.id);
  assert.equal(member.sponsor_id, 'sponsor'); assert.equal(member.binary_parent_id, 'parent'); assert.equal(member.binary_position, position); assert.equal(member.in_holding_tank, 0);
  const column = position === 'L' ? 'binary_left_id' : 'binary_right_id';
  assert.equal(env.DB.sqlite.prepare(`SELECT ${column} child FROM members WHERE id='parent'`).get().child, member.id);
  assert.equal(counts(env.DB).holding_tank, 0);
});
test('final POST rejects missing, invalid and inactive sponsors, invalid method and placement', async t => {
  const env = fixture(t); seed(env.DB, 'inactive', 'inactive', 0);
  const before = counts(env.DB);
  const cases = [
    [{ registration_method: 'M3' }, 'INVALID_SPONSOR'],
    [{ registration_method: 'M2', binary_parent_id: 'sponsor', binary_position: 'L' }, 'INVALID_SPONSOR'],
    [{ sponsor_id: 'missing' }, 'INVALID_SPONSOR'],
    [{ registration_method: 'M3', sponsor_id: 'inactive' }, 'SPONSOR_NO_LICENSE'],
    [{ registration_method: 'unknown' }, 'INVALID_METHOD'],
    [{ registration_method: 'M2', sponsor_id: 'sponsor', binary_parent_id: 'missing', binary_position: 'L' }, 'INVALID_PARENT'],
    [{ registration_method: 'M2', sponsor_id: 'sponsor', binary_parent_id: 'sponsor', binary_position: 'X' }, 'INVALID_POSITION'],
    [{ binary_parent_id: 'sponsor', binary_position: 'L' }, 'INVALID_POSITION'],
  ];
  for (const [overrides, code] of cases) assert.equal((await post(env, body(overrides))).data.code, code);
  assert.deepEqual(counts(env.DB), before);
});
test('server enforces configured required fields and real birth dates', async t => {
  const env = fixture(t);
  env.DB.sqlite.exec(`INSERT OR REPLACE INTO system_config(key,value) VALUES ('reg_required_fields','["phone","city"]')`);
  assert.equal((await post(env, body())).data.code, 'MISSING_FIELDS');
  assert.equal((await post(env, body({ phone: '123', city: 'Example', birth_date: '1990-02-30' }))).data.code, 'INVALID_BIRTH_DATE');
  assert.equal((await post(env, body({ phone: '123', city: 'Example' }))).status, 201);
});
test('two concurrent registrations cannot occupy the same binary slot', async t => {
  const env = fixture(t); const before = counts(env.DB);
  let arrived = 0; let release; const gate = new Promise(resolve => { release = resolve; });
  env.DB.beforeBatch = async () => { if (++arrived === 2) release(); await gate; };
  const common = { registration_method: 'M2', sponsor_id: 'sponsor', binary_parent_id: 'sponsor', binary_position: 'L' };
  const results = await Promise.all([post(env, body(common)), post(env, body({ ...common, email: 'second@example.invalid' }))]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.equal(results.find(r => r.status === 409).data.code, 'SLOT_TAKEN');
  assert.equal(counts(env.DB).members, before.members + 1);
  assert.equal(counts(env.DB).wallets, before.wallets + 1);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) n FROM members WHERE binary_parent_id='sponsor' AND binary_position='L'").get().n, 1);
});
test('license deactivation between validation and insertion prevents all writes', async t => {
  const env = fixture(t); const before = counts(env.DB);
  env.DB.beforeBatch = async () => { env.DB.sqlite.exec("UPDATE members SET license_active=0 WHERE id='sponsor'"); };
  const result = await post(env, body({ registration_method: 'M3', sponsor_id: 'sponsor' }));
  assert.equal(result.status, 403); assert.equal(result.data.code, 'SPONSOR_NO_LICENSE'); assert.deepEqual(counts(env.DB), before);
});
test('an intermediate SQL failure rolls back account, wallet, placement and notifications', async t => {
  const env = fixture(t); const before = counts(env.DB);
  env.DB.sqlite.exec("CREATE TRIGGER fail_notification BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'synthetic notification failure'); END");
  const originalError = console.error; console.error = () => {};
  let result;
  try { result = await post(env, body({ registration_method: 'M2', sponsor_id: 'sponsor', binary_parent_id: 'sponsor', binary_position: 'L' })); }
  finally { console.error = originalError; }
  assert.equal(result.status, 500); assert.equal(result.data.code, 'REGISTRATION_FAILED');
  assert.deepEqual(counts(env.DB), before);
  assert.equal(env.DB.sqlite.prepare("SELECT binary_left_id FROM members WHERE id='sponsor'").get().binary_left_id, null);
  env.DB.sqlite.exec('DROP TRIGGER fail_notification');
  assert.equal((await post(env, body())).status, 201);
});
test('concurrent duplicate emails produce one complete account', async t => {
  const env = fixture(t); const before = counts(env.DB);
  let arrived = 0; let release; const gate = new Promise(resolve => { release = resolve; });
  env.DB.beforeBatch = async () => { if (++arrived === 2) release(); await gate; };
  const results = await Promise.all([post(env, body()), post(env, body({ email: 'NEW@example.invalid' }))]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.equal(results.find(r => r.status === 409).data.code, 'EMAIL_EXISTS');
  assert.equal(counts(env.DB).members, before.members + 1); assert.equal(counts(env.DB).wallets, before.wallets + 1);
});

function browserContext(reg, getResponse, legacy = false) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', checked: true, disabled: false, style: {}, classList: { add() {}, remove() {}, toggle() {} }, scrollIntoView() {}, addEventListener() {} });
    return elements.get(id);
  };
  const calls = [];
  const context = vm.createContext({ URLSearchParams, console, setTimeout, clearTimeout,
    addEventListener() {},
    document: { getElementById: element, querySelectorAll: () => [], addEventListener() {} },
    axios: { get: async () => { if (getResponse instanceof Error) throw getResponse; return { data: getResponse }; }, post: async (...args) => { calls.push(args); throw new Error('Unexpected registration'); } },
    localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} },
    api: async (...args) => { if (args[0] === 'GET') return { fields: [] }; calls.push(args); throw new Error('Unexpected registration'); },
  });
  context.window = context;
  context.__REG__ = reg; context.__REGISTRATION__ = reg;
  const prefix = legacy ? 'reg-' : 'r-';
  for (const suffix of ['firstname', 'lastname']) element(prefix + suffix).value = 'Audit';
  element(prefix + 'email').value = 'audit@example.invalid';
  for (const suffix of ['password', 'password2']) element(prefix + suffix).value = 'test-only-password';
  return { context, element, calls };
}
let publicScripts;
async function standaloneScripts(env) {
  if (!publicScripts) {
    const html = await (await app.request('/register/megalen', {}, env)).text();
    publicScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim() && !s.includes('window.__REG__ ='));
    assert.ok(publicScripts.some(s => s.includes('async function doRegister')));
    for (const script of publicScripts) new vm.Script(script);
  }
  return publicScripts;
}
for (const legacy of [false, true]) {
  const name = legacy ? 'legacy form' : 'standalone form';
  test(`${name}: invalid, inactive or unavailable referral cannot submit without a sponsor`, async t => {
    const env = fixture(t);
    for (const response of [{ found: false, message: 'Parrain introuvable.' }, { found: false, reason: 'no_license', message: 'Licence inactive.' }, new Error('Network unavailable')]) {
      const browser = browserContext({ mode: 'M3', sponsorUid: 'megalen' }, response, legacy);
      if (legacy) {
        const source = readFileSync(new URL('../public/static/member-app.js', import.meta.url), 'utf8');
        vm.runInContext(source.slice(source.indexOf('async function initRegistrationMode()'), source.indexOf('function showPinConfirmation')), browser.context);
      } else for (const script of await standaloneScripts(env)) vm.runInContext(script, browser.context);
      await vm.runInContext(legacy ? 'initRegistrationMode()' : 'initPage()', browser.context);
      assert.equal(browser.element(legacy ? 'reg-submit-btn' : 'r-submit-btn').disabled, true);
      await vm.runInContext('doRegister()', browser.context);
      assert.equal(browser.calls.length, 0);
    }
  });
  test(`${name}: valid sponsor enables submission and preserves canonical UID`, async t => {
    const env = fixture(t);
    const browser = browserContext({ mode: 'M3', sponsorUid: 'MEGALEN' }, { found: true, id: 'sponsor', name: 'Audit Example', unique_id: 'megalen' }, legacy);
    if (legacy) {
      const source = readFileSync(new URL('../public/static/member-app.js', import.meta.url), 'utf8');
      vm.runInContext(source.slice(source.indexOf('async function initRegistrationMode()'), source.indexOf('function showPinConfirmation')), browser.context);
    } else for (const script of await standaloneScripts(env)) vm.runInContext(script, browser.context);
    await vm.runInContext(legacy ? 'initRegistrationMode()' : 'initPage()', browser.context);
    assert.equal(browser.element(legacy ? 'reg-submit-btn' : 'r-submit-btn').disabled, false);
    assert.match(browser.element(legacy ? 'sponsor-banner-text' : 'sponsor-banner-name').textContent, /megalen/);
    await vm.runInContext('doRegister()', browser.context);
    assert.equal(browser.calls.length, 1);
    const submitted = browser.calls[0][legacy ? 2 : 1];
    assert.equal(submitted.registration_method, 'M3');
    assert.equal(submitted.sponsor_id, 'sponsor');
  });
  test(`${name}: an invalid optional referral is never silently discarded`, async t => {
    const env = fixture(t);
    const browser = browserContext({ mode: 'M1' }, { found: false, message: 'Parrain introuvable.' }, legacy);
    if (legacy) {
      const source = readFileSync(new URL('../public/static/member-app.js', import.meta.url), 'utf8');
      vm.runInContext(source.slice(source.indexOf('async function initRegistrationMode()'), source.indexOf('function showPinConfirmation')), browser.context);
    } else for (const script of await standaloneScripts(env)) vm.runInContext(script, browser.context);
    await vm.runInContext(legacy ? 'initRegistrationMode()' : 'initPage()', browser.context);
    browser.element(legacy ? 'reg-sponsor' : 'r-sponsor-code').value = 'missing';
    await vm.runInContext('doRegister()', browser.context);
    assert.equal(browser.calls.length, 0);
  });
  test(`${name}: binary link submits the recruiter, selected parent and normalized side`, async t => {
    const env = fixture(t);
    const browser = browserContext({ mode: 'M2', sponsor: 'MEGALEN', parent: 'other', position: 'l' },
      { valid: true, sponsor_id: 'sponsor', parent_id: 'parent', sponsor_name: 'Sponsor', parent_name: 'Parent', sponsor_unique_id: 'megalen', parent_unique_id: 'other', position: 'L' }, legacy);
    if (legacy) {
      const source = readFileSync(new URL('../public/static/member-app.js', import.meta.url), 'utf8');
      vm.runInContext(source.slice(source.indexOf('async function initRegistrationMode()'), source.indexOf('function showPinConfirmation')), browser.context);
    } else for (const script of await standaloneScripts(env)) vm.runInContext(script, browser.context);
    await vm.runInContext(legacy ? 'initRegistrationMode()' : 'initPage()', browser.context);
    await vm.runInContext('doRegister()', browser.context);
    assert.equal(browser.calls.length, 1);
    const submitted = browser.calls[0][legacy ? 2 : 1];
    assert.equal(submitted.registration_method, 'M2');
    assert.equal(submitted.sponsor_id, 'sponsor');
    assert.equal(submitted.binary_parent_id, 'parent');
    assert.equal(submitted.binary_position, 'L');
  });
}
