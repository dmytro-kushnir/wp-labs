import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLocalStore } from '../../src/store/local-store.js';
import { StoreError } from '../../src/store/errors.js';

const seed = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url), 'utf8'));

/** Імітація localStorage у Node.js: той самий інтерфейс getItem/setItem поверх Map. */
function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
}

const newBook = { title: 'Інтернат', author: 'Сергій Жадан', year: 2017, isbn: '9786171263017', genre: 'fiction', price: 300, available: true, receivedAt: '2026-03-02' };

test('list: фільтр, сортування і сторінки', async () => {
  const store = createLocalStore(seed, memoryStorage());
  const page = await store.list({ genre: 'fiction', sort: 'year', order: 'asc', limit: 2 });
  assert.equal(page.total, 3);
  assert.deepEqual(page.items.map((b) => b.year), [1902, 1944]);
});

test('create: нова книга отримує id і зберігається', async () => {
  const storage = memoryStorage();
  const store = createLocalStore(seed, storage);
  const created = await store.create(newBook);
  assert.equal(created.id, 13);
  assert.ok(created.createdAt);
  // нове сховище над тим самим storage бачить збережені дані
  assert.equal((await createLocalStore(seed, storage).get(13)).title, 'Інтернат');
});

test('create: невалідні дані → StoreError 400 з деталями', async () => {
  const store = createLocalStore(seed, memoryStorage());
  await assert.rejects(store.create({ ...newBook, year: 3000 }), (error) => {
    assert.ok(error instanceof StoreError);
    assert.equal(error.status, 400);
    assert.deepEqual(error.details.map((d) => d.field), ['year']);
    return true;
  });
});

test('create: назва, що вже є в каталозі (правило № 1) → 400', async () => {
  const store = createLocalStore(seed, memoryStorage());
  await assert.rejects(store.create({ ...newBook, title: 'КОБЗАР' }), { status: 400, details: [{ field: 'title', message: 'Книга з такою назвою вже є в каталозі' }] });
});

test('update і remove; неіснуючий запис → 404', async () => {
  const store = createLocalStore(seed, memoryStorage());
  const book = await store.get(1);
  const updated = await store.update(1, { ...book, available: false });
  assert.equal(updated.available, false);
  assert.equal(updated.createdAt, book.createdAt);
  await store.remove(1);
  await assert.rejects(store.get(1), { status: 404 });
  await assert.rejects(store.remove(1), { code: 'NOT_FOUND' });
});

test('початкові дані не змінюються', async () => {
  const store = createLocalStore(seed, memoryStorage());
  await store.remove(2);
  assert.equal(seed.length, 12);
});
