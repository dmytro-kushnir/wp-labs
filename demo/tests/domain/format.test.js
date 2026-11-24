import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogSummary, formatDate, formatPrice, formatUsd, pluralize } from '../../src/domain/format.js';
import { twoSum } from '../../src/algorithms/two-sum.js';

// Intl ставить нерозривні пробіли (U+00A0, U+202F) – для порівняння замінюємо їх звичайними.
const plain = (s) => s.replace(/[  ]/g, ' ');

test('formatPrice: гривні з копійками', () => {
  assert.equal(plain(formatPrice(1234.5)), '1 234,50 грн');
  assert.equal(plain(formatUsd(9.3166)), '9,32 $');
});

test('formatDate: дата українською', () => {
  assert.match(formatDate('2026-11-24T10:00:00Z'), /^24 листопада 2026/);
});

test('pluralize: 1 книга, 3 книги, 5 книг, 21 книга', () => {
  const forms = { one: 'книга', few: 'книги', many: 'книг' };
  assert.deepEqual([1, 3, 5, 11, 21].map((n) => pluralize(n, forms)), ['1 книга', '3 книги', '5 книг', '11 книг', '21 книга']);
});

test('catalogSummary', () => {
  assert.equal(catalogSummary({ count: 12, available: 9 }), '12 книг, з них доступно 9');
});

test('twoSum (LeetCode 1)', () => {
  assert.deepEqual(twoSum([2, 7, 11, 15], 9), [0, 1]);
  assert.deepEqual(twoSum([3, 2, 4], 6), [1, 2]);
  assert.equal(twoSum([1, 2], 7), null);
});
