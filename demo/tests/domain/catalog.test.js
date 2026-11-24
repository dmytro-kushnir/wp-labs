import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogStats, filterBooks, groupByGenre, paginate, sortBooks } from '../../src/domain/catalog.js';
import { validateBook } from '../../src/domain/validate.js';

const books = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url), 'utf8'));
const ids = (list) => list.map((b) => b.id);

test('початкові дані проходять валідацію', () => {
  for (const b of books) assert.deepEqual(validateBook(b, { today: '2026-11-24', existing: books }), [], b.title);
});

test('filterBooks: пошук за назвою або автором без урахування регістру', () => {
  assert.deepEqual(ids(filterBooks(books, { q: 'шевченко' })), [2]);
  assert.deepEqual(ids(filterBooks(books, { q: '  ГОБІТ ' })), [5]);
});

test('filterBooks: комбінація фільтрів', () => {
  assert.deepEqual(ids(filterBooks(books, { genre: 'poetry', available: true })), [2]);
  assert.deepEqual(ids(filterBooks(books, { yearFrom: 2000 })), [7, 11]);
});

test('sortBooks не змінює вихідний масив', () => {
  const before = ids(books);
  const sorted = sortBooks(books, 'year', 'desc');
  assert.deepEqual(ids(books), before);
  assert.equal(sorted[0].year, 2015);
});

test('sortBooks: рядки порівнюються за українським алфавітом', () => {
  const titles = sortBooks([{ title: 'Їжак' }, { title: 'Ґанок' }, { title: 'Іриска' }, { title: 'Гора' }]).map((b) => b.title);
  assert.deepEqual(titles, ['Гора', 'Ґанок', 'Іриска', 'Їжак']);
});

test('groupByGenre і catalogStats', () => {
  assert.equal(groupByGenre(books).poetry.length, 2);
  const stats = catalogStats(books);
  assert.equal(stats.count, 12);
  assert.equal(stats.available, 9);
  assert.equal(stats.byGenre.fantasy, 2);
  assert.deepEqual(catalogStats([]), { count: 0, available: 0, averageYear: null, totalPrice: 0, byGenre: {} });
});

test('paginate обмежує номер сторінки', () => {
  assert.deepEqual(ids(paginate(books, 2, 5).items), [6, 7, 8, 9, 10]);
  assert.equal(paginate(books, 99, 5).page, 3);
  assert.equal(paginate([], 1, 5).pages, 1);
});
