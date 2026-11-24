import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Book, EBook, GENRES } from '../../src/domain/book.js';

const data = { id: 1, title: 'Кобзар', author: 'Тарас Шевченко', year: 1840, isbn: '9789660368378', genre: 'poetry', price: 450, available: false };

test('Book: поля з об’єкта даних', () => {
  const b = new Book(data);
  assert.equal(b.title, 'Кобзар');
  assert.equal(b.genreLabel, GENRES.poetry);
});

test('Book: вік і класика відносно заданого року', () => {
  const b = new Book(data);
  assert.equal(b.age(2026), 186);
  assert.equal(b.isClassic(2026), true);
  assert.equal(new Book({ ...data, year: 2000 }).isClassic(2026), false);
});

test('Book.from не створює копію, якщо вже передано Book', () => {
  const b = new Book(data);
  assert.equal(Book.from(b), b);
  assert.ok(Book.from(data) instanceof Book);
});

test('EBook наслідує Book і завжди доступна', () => {
  const e = new EBook({ ...data, format: 'pdf' });
  assert.ok(e instanceof Book);
  assert.equal(e.isAvailable(), true);
  assert.equal(new Book(data).isAvailable(), false);
  assert.match(e.toString(), /^«Кобзар», Тарас Шевченко \(1840\) \[PDF\]$/);
});
