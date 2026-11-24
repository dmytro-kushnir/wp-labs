// Інтеграційні тести HTTP-клієнта і сховища проти справжнього mock-сервера на випадковому порту,
// а також перевірка тайм-ауту і помилки мережі з підміненим fetch.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMockServer } from '../../../tools/mock-server.mjs';
import { createApiClient } from '../../src/api/client.js';
import { createHttpStore } from '../../src/store/http-store.js';
import { StoreError } from '../../src/store/errors.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const entity = read('../../entity.json');
const seed = read('../../data/items.json');

let server;
let store;

before(async () => {
  server = createMockServer({ entity, seed });
  await new Promise((resolve) => server.listen(0, resolve));
  store = createHttpStore(createApiClient(`http://localhost:${server.address().port}`));
});
after(() => server.close());

const newBook = { title: 'Інтернат', author: 'Сергій Жадан', year: 2017, isbn: '9786171263017', genre: 'fiction', price: 300, available: true, receivedAt: '2026-03-02' };

test('list: параметри запиту передаються серверу', async () => {
  const page = await store.list({ genre: 'poetry', sort: 'year', order: 'desc', limit: 5 });
  assert.equal(page.total, 2);
  assert.deepEqual(page.items.map((b) => b.year), [1911, 1840]);
});

test('list: пошук ?q= за назвою і автором, як у локальному сховищі', async () => {
  assert.deepEqual((await store.list({ q: 'шевченко' })).items.map((b) => b.id), [2]);
});

test('list: номер сторінки поза межами замінюється останньою', async () => {
  const page = await store.list({ page: 99, limit: 5 });
  assert.equal(page.page, 3);
  assert.equal(page.items.length, 2);
});

test('list: порожні значення фільтрів не надсилаються', async () => {
  const page = await store.list({ q: '', genre: undefined });
  assert.equal(page.total, 12);
});

test('create → get → update → remove', async () => {
  const created = await store.create(newBook);
  assert.equal(created.title, 'Інтернат');
  assert.equal((await store.get(created.id)).author, 'Сергій Жадан');
  assert.equal((await store.update(created.id, { ...newBook, price: 350 })).price, 350);
  assert.equal(await store.remove(created.id), null);
  await assert.rejects(store.get(created.id), { status: 404, code: 'NOT_FOUND' });
});

test('помилка валідації сервера → StoreError з деталями', async () => {
  await assert.rejects(store.create({ ...newBook, genre: 'horror', price: -5 }), (error) => {
    assert.ok(error instanceof StoreError);
    assert.equal(error.status, 400);
    assert.deepEqual(error.details.map((d) => d.field).sort(), ['genre', 'price']);
    return true;
  });
});

test('тайм-аут → StoreError TIMEOUT', async () => {
  const neverAnswers = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  });
  const client = createApiClient('http://example.test', { fetchFn: neverAnswers, timeout: 50 });
  await assert.rejects(client.request('/api/items'), { code: 'TIMEOUT' });
});

test('немає з’єднання → StoreError NETWORK', async () => {
  const offline = async () => { throw new TypeError('fetch failed'); };
  const client = createApiClient('http://example.test', { fetchFn: offline });
  await assert.rejects(client.request('/api/items'), { code: 'NETWORK' });
});

test('скасування запиту передається як AbortError', async () => {
  const controller = new AbortController();
  const pending = store.list({ signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
