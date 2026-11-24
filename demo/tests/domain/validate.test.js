import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isIsoDate, isValidIsbn13, validateBook } from '../../src/domain/validate.js';

const valid = { title: 'Тигролови', author: 'Іван Багряний', year: 1944, isbn: '9789660370906', genre: 'fiction', price: 320, available: true, receivedAt: '2019-03-04' };
const today = '2026-11-24';
const fields = (errors) => errors.map((e) => e.field);

test('isValidIsbn13: контрольна цифра', () => {
  assert.equal(isValidIsbn13('9789660370906'), true);
  assert.equal(isValidIsbn13('9789660370907'), false);   // змінено останню цифру
  assert.equal(isValidIsbn13('978966037090'), false);    // 12 цифр
  assert.equal(isValidIsbn13(9789660370906), false);     // не рядок
});

test('validateBook: коректні дані – без помилок', () => {
  assert.deepEqual(validateBook(valid, { today }), []);
});

test('validateBook: порожні назва й автор', () => {
  assert.deepEqual(fields(validateBook({ ...valid, title: '  ', author: '' })), ['title', 'author']);
});

test('validateBook: рік – ціле число в межах', () => {
  for (const year of [1449, 2027, 1944.5, '1944']) {
    assert.deepEqual(fields(validateBook({ ...valid, year }, { today })), ['year'], `year=${year}`);
  }
});

test('validateBook: жанр зі списку, вартість невід’ємна, available – булеве', () => {
  const errors = validateBook({ ...valid, genre: 'horror', price: -1, available: 'так' });
  assert.deepEqual(fields(errors), ['genre', 'price', 'available']);
});

test('validateBook: null замість об’єкта не кидає виняток', () => {
  assert.equal(validateBook(null).length, 8);
});

test('isIsoDate: лише наявні дати РРРР-ММ-ДД', () => {
  assert.equal(isIsoDate('2024-02-29'), true);
  for (const v of ['2027-02-30', '2027/03/01', '1', 'March 1, 2027', 20240229]) assert.equal(isIsoDate(v), false, String(v));
});

test('validateBook: дата надходження не в майбутньому', () => {
  assert.deepEqual(fields(validateBook({ ...valid, receivedAt: '2026-11-25' }, { today })), ['receivedAt']);
  assert.deepEqual(validateBook({ ...valid, receivedAt: today }, { today }), []);
});

test('індивідуальне правило № 1: назва унікальна без урахування регістру', () => {
  const existing = [{ id: 7, title: 'Тигролови' }];
  assert.deepEqual(fields(validateBook({ ...valid, title: '  тигролови ' }, { today, existing })), ['title']);
  // запис, що редагується, сам із собою не конфліктує
  assert.deepEqual(validateBook({ ...valid, id: 7 }, { today, existing }), []);
});
