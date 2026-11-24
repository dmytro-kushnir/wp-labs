// Тести mock-сервера: перевірка даних, фільтри, сторінки, пошук і помилкові запити.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMockServer, isIsoDate, validateInput } from '../tools/mock-server.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const entity = read('../demo/entity.json');
const seed = read('../demo/data/items.json');

let base;
let server;
before(async () => {
  server = createMockServer({ entity, seed });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

test('дата: лише наявні дати РРРР-ММ-ДД', () => {
  assert.equal(isIsoDate('2024-02-29'), true);
  for (const v of ['1', 'hello 5', '2027-02-30', '2027/03/01', 'March 1, 2027']) assert.equal(isIsoDate(v), false, v);
  const book = { ...seed[0], receivedAt: '2027-02-30' };
  assert.deepEqual(validateInput(entity, book).map((e) => e.field), ['receivedAt']);
});

test('фільтри: значення неправильного типу → 400, id – число', async () => {
  assert.equal((await get('/api/items?available=yes')).status, 400);
  assert.equal((await get('/api/items?price=abc')).status, 400);
  assert.equal((await get('/api/items?color=red')).status, 400);
  assert.deepEqual((await get('/api/items?id=2')).body.items.map((b) => b.title), ['Кобзар']);
});

test('сторінки: неправильні page/limit → 400, завелика сторінка → остання', async () => {
  for (const q of ['limit=0', 'limit=-3', 'limit=101', 'page=0', 'page=abc']) assert.equal((await get(`/api/items?${q}`)).status, 400, q);
  const { body } = await get('/api/items?page=99&limit=5');
  assert.deepEqual([body.page, body.items.length, body.total], [3, 2, 12]);
});

test('пошук: назва і поля з позначкою search', async () => {
  assert.deepEqual((await get('/api/items?q=%D1%88%D0%B5%D0%B2%D1%87%D0%B5%D0%BD%D0%BA%D0%BE')).body.items.map((b) => b.id), [2]);   // «шевченко»
});

test('невідомий маршрут і неправильний JSON', async () => {
  const root = await get('/');
  assert.equal(root.status, 404);
  assert.match(root.body.error.message, /Маршрут \/ не знайдено/);
  const res = await fetch(`${base}/api/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'BAD_JSON');
});
