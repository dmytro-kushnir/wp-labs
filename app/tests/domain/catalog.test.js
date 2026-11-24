// ПЗ 1. Тести модуля предметної області. Зразок – demo/tests/domain у репозиторії курсу.
// Обов’язково: щонайменше 10 власних тестів, що перевіряють і коректні, і помилкові дані.
// test.todo показує заплановані тести у звіті node --test; замініть кожен на test(...) з перевірками.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../../src/domain/catalog.js';

test('paginate: друга сторінка і межі', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
  assert.deepEqual(paginate(items, 2, 5).items.map((x) => x.id), [6, 7, 8, 9, 10]);
  assert.equal(paginate(items, 99, 5).page, 3);
});

test.todo('validateItem: коректні дані – без помилок');
test.todo('validateItem: кожне обов’язкове поле – окрема помилка');
test.todo('validateItem: межі числових полів');
test.todo('validateItem: індивідуальне правило – дозволений і заборонений випадок');
test.todo('filterItems: пошук без урахування регістру');
test.todo('filterItems: комбінація двох фільтрів');
test.todo('sortItems: не змінює вихідний масив');
test.todo('sortItems: рядки за українським алфавітом');
test.todo('catalogStats: порожній каталог');
test.todo('клас сутності: метод предметної області');
test.todo('підклас: перевизначений метод');
