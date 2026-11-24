import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, VARIANTS, describeVariant, entityOf, firstRecord, normalizeSurname, ruleNumberOf, surnameSum } from '../tools/variant.mjs';
import { validateInput } from '../tools/mock-server.mjs';

test('S = сума номерів літер; приклад з посібника – PETRENKO', () => {
  assert.equal(surnameSum('PETRENKO'), 104);
  assert.equal(ruleNumberOf(104), 1);
  assert.equal(describeVariant(1, 'PETRENKO').rule.id, 'unique-title');
});

test('прізвище: регістр, дефіс і апостроф не враховуються; кирилиця – помилка', () => {
  assert.equal(normalizeSurname("Koval'-Skyi"), 'KOVALSKYI');
  assert.throws(() => normalizeSurname('Петренко'), /латиницею/);
});

test('30 варіантів, у кожному п’ять полів різних ролей', () => {
  assert.equal(VARIANTS.length, 30);
  for (const v of VARIANTS) {
    const roles = Object.values(v.fields).map((f) => f.role).sort();
    assert.deepEqual(roles, ['bool', 'date', 'enum', 'number', 'text'], v.domain);
    const n = Object.values(v.fields).find((f) => f.role === 'number');
    assert.ok(n.min < n.max, v.domain);
  }
  assert.equal(new Set(VARIANTS.map((v) => v.domain)).size, 30);
});

test('усі 30 × 8 описів правил без незаповнених місць', () => {
  // прізвища з S = 2…9 охоплюють усі залишки за модулем 8
  for (const v of VARIANTS) {
    for (let k = 2; k < 10; k++) {
      const d = describeVariant(v.n, 'A'.repeat(k));
      assert.doesNotMatch(d.rule.text, /[{}]|undefined/, `${v.domain}, S=${k}`);
    }
  }
  assert.equal(RULES.length, 8);
});

test('перший запис проходить валідацію mock-сервера в усіх варіантах', () => {
  for (const v of VARIANTS) {
    const item = firstRecord(v.n, 'PETRENKO');
    assert.deepEqual(validateInput(entityOf(v.n), item), [], v.domain);
    assert.equal(item.title, 'Запис PETRENKO');
  }
});

test('fixtures.json: для всіх 30 варіантів і 8 правил дані узгоджені з описом сутності', async () => {
  const { fixturesOf } = await import('../tools/variant.mjs');
  for (const v of VARIANTS) {
    for (let k = 2; k < 10; k++) {
      const name = 'A'.repeat(k);
      const fx = fixturesOf(v.n, name);
      const entity = entityOf(v.n);
      const where = `${v.domain}, S=${k}`;
      for (const body of [fx.valid, fx.update, ...fx.rule.setup, fx.rule.violation]) {
        assert.deepEqual(validateInput(entity, body), [], `${where}: ${body.title}`);   // правило – не базова валідація
      }
      assert.deepEqual(validateInput(entity, fx.invalid.body).map((e) => e.field).sort(), [...fx.invalid.fields].sort(), where);
      assert.ok(entity.fields[fx.filter.field].enum.includes(fx.filter.value), where);
      assert.equal(new Set(fx.rule.setup.map((b) => b.title)).size, fx.rule.setup.length, where);   // назви підготовчих записів різні
    }
  }
});
