// Інтеграційні тести API: застосунок з базою даних у пам’яті на випадковому порту.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { openDatabase } from '../src/db.ts';
import { createApp } from '../src/app.ts';
import { hashPassword } from '../src/auth.ts';
import { createUsers } from '../src/users.ts';

let server: Server;
let base: string;
let adminToken = '';
const book = { title: 'Інтернат', author: 'Сергій Жадан', year: 2017, isbn: '9786171263017', genre: 'fiction', price: 300, available: true, receivedAt: '2026-03-02' };

before(async () => {
  const db = openDatabase(':memory:');
  createUsers(db).create('admin@example.com', await hashPassword('admin-password'), 'admin');
  server = createApp({ db, corsOrigin: 'http://localhost:5181', jwtSecret: 'test-secret-test-secret-test-secret' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  adminToken = (await call('POST', '/api/auth/login', { email: 'admin@example.com', password: 'admin-password' }, null)).body.token;
});
after(() => server.close());

// Тіло відповіді в тестах має тип any: структуру перевіряють самі тести.
// token: за замовчуванням – токен адміністратора; null – запит без автентифікації.
const call = async (method: string, path: string, body?: unknown, token: string | null = adminToken): Promise<{ status: number; headers: Headers; body: any }> => {
  const headers: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, headers: res.headers, body: res.status === 204 ? null : await res.json() };
};

test('POST → 201, Location; GET за id', async () => {
  const created = await call('POST', '/api/items', book);
  assert.equal(created.status, 201);
  assert.equal(created.headers.get('location'), `/api/items/${created.body.id}`);
  assert.equal((await call('GET', `/api/items/${created.body.id}`)).body.title, 'Інтернат');
});

test('правило № 1: та сама назва в іншому регістрі → 409', async () => {
  const res = await call('POST', '/api/items', { ...book, title: '  ІНТЕРНАТ ' });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.details[0].field, 'title');
});

test('невалідні дані → 400 з деталями по полях', async () => {
  const res = await call('POST', '/api/items', { ...book, title: 'Нова', year: 3000, isbn: '123', receivedAt: '2027-02-30' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details.map((d: { field: string }) => d.field).sort(), ['isbn', 'receivedAt', 'year']);
});

test('список: пошук кирилицею без урахування регістру, фільтр, сортування', async () => {
  await call('POST', '/api/items', { ...book, title: 'Ворошиловград', year: 2010, isbn: '9789660370906' });
  const found = await call('GET', `/api/items?q=${encodeURIComponent('жадан')}&sort=year&order=desc`);
  assert.deepEqual(found.body.items.map((b: { year: number }) => b.year), [2017, 2010]);
  assert.equal((await call('GET', '/api/items?genre=poetry')).body.total, 0);
});

test('неправильні параметри списку → 400', async () => {
  for (const q of ['available=yes', 'limit=0', 'sort=password', 'color=red']) {
    assert.equal((await call('GET', `/api/items?${q}`)).status, 400, q);
  }
});

test('PUT, DELETE, 404 і неправильний JSON', async () => {
  const { body: created } = await call('POST', '/api/items', { ...book, title: 'Месопотамія', isbn: '9789660368378' });
  assert.equal((await call('PUT', `/api/items/${created.id}`, { ...book, title: 'Месопотамія', price: 350 })).body.price, 350);
  assert.equal((await call('DELETE', `/api/items/${created.id}`)).status, 204);
  assert.equal((await call('GET', `/api/items/${created.id}`)).status, 404);
  const bad = await fetch(`${base}/api/items`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: '{oops' });
  assert.equal(bad.status, 400);
  assert.equal(((await bad.json()) as any).error.code, 'BAD_JSON');
});

// ---------------------------------------------------------------- ПЗ 5: автентифікація та авторизація
test('без токена: читання дозволено, зміна – 401 з WWW-Authenticate', async () => {
  assert.equal((await call('GET', '/api/items', undefined, null)).status, 200);
  const res = await call('POST', '/api/items', { ...book, title: 'Без токена' }, null);
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('www-authenticate'), 'Bearer');
});

test('реєстрація і вхід користувача; хеш пароля не повертається', async () => {
  const reg = await call('POST', '/api/auth/register', { email: 'Olena@Example.com', password: 'secret-pass-1' }, null);
  assert.equal(reg.status, 201);
  assert.deepEqual(Object.keys(reg.body).sort(), ['email', 'id', 'role']);
  assert.equal(reg.body.role, 'user');
  assert.equal((await call('POST', '/api/auth/register', { email: 'olena@example.com', password: 'secret-pass-1' }, null)).status, 409);
  const login = await call('POST', '/api/auth/login', { email: 'olena@example.com', password: 'secret-pass-1' }, null);
  assert.equal(login.status, 200);
  const me = await call('GET', '/api/auth/me', undefined, login.body.token);
  assert.equal(me.body.email, 'olena@example.com');
  assert.ok(!JSON.stringify(me.body).includes('scrypt'));
});

test('ролі: користувач створює, але не видаляє (403)', async () => {
  await call('POST', '/api/auth/register', { email: 'user2@example.com', password: 'secret-pass-2' }, null);
  const { body: { token } } = await call('POST', '/api/auth/login', { email: 'user2@example.com', password: 'secret-pass-2' }, null);
  const created = await call('POST', '/api/items', { ...book, title: 'Від користувача', isbn: '9789660368378' }, token);
  assert.equal(created.status, 201);
  assert.equal((await call('DELETE', `/api/items/${created.body.id}`, undefined, token)).status, 403);
  assert.equal((await call('DELETE', `/api/items/${created.body.id}`)).status, 204);
});

test('підроблений і чужий токени → 401', async () => {
  const forged = `${adminToken.slice(0, -4)}AAAA`;
  assert.equal((await call('GET', '/api/auth/me', undefined, forged)).status, 401);
  assert.equal((await call('GET', '/api/auth/me', undefined, 'not-a-jwt')).status, 401);
});

test('ключ пристрою: лише створення записів', async () => {
  const { status, body } = await call('POST', '/api/keys', { name: 'esp32-кімната-1' });
  assert.equal(status, 201);
  assert.match(body.key, /^wp_/);
  const device = (method: string, path: string, payload?: unknown) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-API-Key': body.key }, body: payload ? JSON.stringify(payload) : undefined,
  });
  const created = await device('POST', '/api/items', { ...book, title: 'Від пристрою', isbn: '9789661031110' });
  assert.equal(created.status, 201);
  const { id } = (await created.json()) as any;
  assert.equal((await device('DELETE', `/api/items/${id}`)).status, 403);
  assert.equal((await call('POST', '/api/keys', { name: 'x' }, null)).status, 401);
});

test('5 невдалих входів → 429 з Retry-After', async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await call('POST', '/api/auth/login', { email: 'admin@example.com', password: 'wrong-password' }, null)).status, 401);
  }
  const blocked = await call('POST', '/api/auth/login', { email: 'admin@example.com', password: 'admin-password' }, null);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});
