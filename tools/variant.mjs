#!/usr/bin/env node
// Індивідуальний варіант практичних завдань (Додаток А посібника).
//   предметна область – за номером у журналі (таблиця variants.json, 1–30);
//   індивідуальне правило валідації – № (S mod 8) + 1, де S – сума номерів літер прізвища латиницею (A = 1 … Z = 26);
//   перший запис початкових даних містить прізвище студента.
//
// Запуск з кореня репозиторію (працює однаково в терміналі macOS/Linux, PowerShell і cmd):
//   node tools/variant.mjs PETRENKO --number 7           – показати варіант
//   node tools/variant.mjs PETRENKO --number 7 --write   – записати app/entity.json, app/variant.json, app/fixtures.json, app/data/items.json
//   node tools/variant.mjs --list group.txt              – таблиця для викладача (рядки «номер ПРІЗВИЩЕ»)
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { parseCli } from './args.mjs';
import { fileURLToPath } from 'node:url';

/** Каталог застосунку студента – app/ поруч із tools/, незалежно від того, звідки запущено скрипт. */
const APP = new URL('../app/', import.meta.url);

export const VARIANTS = JSON.parse(readFileSync(new URL('./variants.json', import.meta.url), 'utf8'));

/** Індивідуальні правила валідації; {T} {N} {D} {E} {E0} {B} – назви полів варіанту. */
export const RULES = [
  { id: 'unique-title', server: 409, text: 'Назва запису («{title}») унікальна в каталозі без урахування регістру і пробілів по краях; повтор – помилка; сервер (ПЗ 4) відповідає 409 Conflict.' },
  { id: 'date-range', server: 400, text: '«{D}» – не раніше 01.01.2000 і не пізніше ніж через рік від поточної дати.' },
  { id: 'weekday', server: 400, text: '«{D}» – лише робочий день (понеділок – п’ятниця).' },
  { id: 'bool-requires-words', server: 400, text: 'Якщо «{B}» = так, поле «{T}» має містити щонайменше два слова.' },
  { id: 'title-format', server: 400, text: 'Назва запису («{title}») починається з великої літери, не починається з цифри і не містить двох пробілів поспіль.' },
  { id: 'forbidden-combo', server: 400, text: 'Заборонено поєднання «{E}» = «{E0}» і «{B}» = так.' },
  { id: 'normalize-text', server: 200, text: 'Значення «{T}» нормалізується перед збереженням: пробіли по краях і повторні пробіли прибираються, перша літера – велика; сервер (ПЗ 4) повертає нормалізоване значення.' },
  { id: 'limit-per-date', server: 409, text: 'Не більше 3 записів з однаковим значенням «{E}» на одну дату «{D}»; четвертий – помилка; сервер (ПЗ 4) відповідає 409 Conflict.' },
];

/** Прізвище латиницею (КМУ № 55 від 27.01.2010, як у закордонному паспорті) → лише літери A–Z. */
export function normalizeSurname(surname) {
  const s = String(surname).toUpperCase().replace(/[\s'’ʼ-]/g, '');
  if (!/^[A-Z]{2,}$/.test(s)) throw new Error('Прізвище – латиницею, лише літери A–Z (наприклад, PETRENKO)');
  return s;
}

/** S = сума номерів літер: A = 1, B = 2, …, Z = 26. */
export const surnameSum = (surname) => [...normalizeSurname(surname)].reduce((sum, ch) => sum + ch.charCodeAt(0) - 64, 0);

/** Поле варіанту за роллю (text, number, date, enum, bool). */
export const byRole = (variant, role) => {
  const entry = Object.entries(variant.fields).find(([, f]) => f.role === role);
  return { key: entry[0], ...entry[1] };
};

/** Номер індивідуального правила: (S mod 8) + 1. */
export const ruleNumberOf = (S) => (S % RULES.length) + 1;

/** Повний індивідуальний варіант із назвами полів предметної області. */
export function describeVariant(number, surname) {
  const variant = VARIANTS.find((v) => v.n === Number(number));
  if (!variant) throw new Error(`Номер варіанту – від 1 до ${VARIANTS.length}`);
  const S = surnameSum(surname);
  const rule = RULES[ruleNumberOf(S) - 1];
  const f = Object.fromEntries(['text', 'number', 'date', 'enum', 'bool'].map((r) => [r, byRole(variant, r)]));
  const names = { title: variant.titleLabel, T: f.text.label, N: f.number.label, D: f.date.label, E: f.enum.label, E0: f.enum.labels[f.enum.enum[0]], B: f.bool.label };
  return {
    number: variant.n,
    surname: normalizeSurname(surname),
    S,
    domain: variant.domain,
    entity: variant.entity,
    rule: {
      number: ruleNumberOf(S),
      id: rule.id,
      server: rule.server,
      text: rule.text.replace(/\{(\w+)\}/g, (_, k) => names[k]),
      fields: { title: 'title', text: f.text.key, number: f.number.key, date: f.date.key, enum: f.enum.key, bool: f.bool.key },
    },
  };
}

/** Опис сутності для mock-сервера і форми (entity.json); текстове поле бере участь у пошуку ?q=. */
export function entityOf(number) {
  const v = VARIANTS.find((x) => x.n === Number(number));
  const fields = Object.fromEntries(Object.entries(v.fields).map(([k, f]) => [k, f.role === 'text' ? { ...f, search: true } : f]));
  return { name: v.name, title: v.entity, titleLabel: v.titleLabel, fields };
}

/** Дата за місцевим часом у форматі РРРР-ММ-ДД (toISOString() дав би дату за UTC – між 00:00 і 02:00 це вчорашній день). */
const localIsoDate = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

/** Перший запис початкових даних: у назві – прізвище студента, решта значень проходить будь-яке з правил. */
export function firstRecord(number, surname) {
  const v = VARIANTS.find((x) => x.n === Number(number));
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);   // робочий день
  const item = { id: 1, title: `Запис ${normalizeSurname(surname)}` };
  for (const [key, field] of Object.entries(v.fields)) {
    if (field.role === 'text') item[key] = 'Приклад значення';
    if (field.role === 'number') item[key] = field.min;
    if (field.role === 'date') item[key] = localIsoDate(d);
    if (field.role === 'enum') item[key] = field.enum.at(-1);
    if (field.role === 'bool') item[key] = false;
  }
  return item;
}

/** Найближчий робочий день через ~місяць і найближча субота (для правил № 2 і № 3), РРРР-ММ-ДД за місцевим часом. */
function sampleDates() {
  const weekday = new Date();
  weekday.setMonth(weekday.getMonth() + 1);
  while (weekday.getDay() === 0 || weekday.getDay() === 6) weekday.setDate(weekday.getDate() + 1);
  const saturday = new Date(weekday);
  while (saturday.getDay() !== 6) saturday.setDate(saturday.getDate() + 1);
  return { weekday: localIsoDate(weekday), saturday: localIsoDate(saturday) };
}

/**
 * Дані контрактних тестів (app/fixtures.json) для варіанту: коректний, оновлений і хибний запис,
 * фільтр за полем-переліком і перевірка індивідуального правила (setup – підготовчі записи, violation – порушення).
 */
export function fixturesOf(number, surname) {
  const v = VARIANTS.find((x) => x.n === Number(number));
  const d = describeVariant(number, surname);
  const k = d.rule.fields;
  const f = Object.fromEntries(['text', 'number', 'date', 'enum', 'bool'].map((r) => [r, byRole(v, r)]));
  const { weekday, saturday } = sampleDates();
  const record = (title, extra = {}) => ({
    title, [k.text]: 'Приклад значення', [k.number]: f.number.min, [k.date]: weekday, [k.enum]: f.enum.enum.at(-1), [k.bool]: false, ...extra,
  });
  const step = f.number.type === 'integer' ? 1 : 0.5;
  const setupTitle = 'Запис для перевірки правила';
  const rules = {
    'unique-title': { setup: [record('Унікальна назва')], violation: record('  УНІКАЛЬНА НАЗВА '), status: 409 },
    'date-range': { setup: [record(setupTitle)], violation: record('Стара дата', { [k.date]: '1999-12-31' }), status: 400 },
    weekday: { setup: [record(setupTitle)], violation: record('Субота', { [k.date]: saturday }), status: 400 },
    'bool-requires-words': { setup: [record(setupTitle)], violation: record('Одне слово', { [k.bool]: true, [k.text]: 'Приклад' }), status: 400 },
    'title-format': { setup: [record(setupTitle)], violation: record('2 запис з цифри'), status: 400 },
    'forbidden-combo': { setup: [record(setupTitle)], violation: record('Заборонене поєднання', { [k.enum]: f.enum.enum[0], [k.bool]: true }), status: 400 },
    'normalize-text': { setup: [record(setupTitle)], violation: record('Нормалізація', { [k.text]: '  приклад   значення ' }), status: 201, expect: { [k.text]: 'Приклад значення' } },
    'limit-per-date': { setup: [1, 2, 3].map((i) => record(`Ліміт на дату ${i}`)), violation: record('Ліміт на дату 4'), status: 409 },
  };
  return {
    valid: record('Перевірка контракту'),
    update: record('Перевірка контракту', { [k.number]: f.number.min + step, [k.bool]: true }),
    invalid: {
      body: { title: '', [k.text]: '', [k.number]: f.number.min - step, [k.date]: '2027-02-30', [k.enum]: 'немає-такого', [k.bool]: 'так' },
      fields: ['title', k.text, k.number, k.date, k.enum, k.bool],
    },
    filter: { field: k.enum, value: f.enum.enum.at(-1) },
    rule: { description: `Правило № ${d.rule.number}`, ...rules[d.rule.id] },
  };
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const { values, positionals } = parseCli({ allowPositionals: true, options: { number: { type: 'string' }, write: { type: 'boolean', default: false }, list: { type: 'string' } } }, 'node tools/variant.mjs PETRENKO --number 7 --write');
    if (values.list) {
      const rows = readFileSync(values.list, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      console.log('| № | Прізвище | S | Предметна область | Правило |');
      console.log('|---|---|---|---|---|');
      for (const row of rows) {
        const [number, ...name] = row.split(/[\s;,]+/);
        const v = describeVariant(number, name.join(''));
        console.log(`| ${v.number} | ${v.surname} | ${v.S} | ${v.domain} | № ${v.rule.number}: ${v.rule.text} |`);
      }
      process.exit(0);
    }
    const [surname] = positionals;
    if (!surname) throw new Error('Вкажіть прізвище латиницею, наприклад: node tools/variant.mjs PETRENKO --number 7 --write');
    const S = surnameSum(surname);
    console.log(`Прізвище: ${normalizeSurname(surname)}   S = ${S}   правило № ${ruleNumberOf(S)}`);
    if (!values.number) {
      console.log('Додайте --number <номер у журналі>, щоб отримати предметну область і текст правила.');
      process.exit(0);
    }
    const v = describeVariant(values.number, surname);
    console.log(`Варіант № ${v.number}: ${v.domain} – сутність «${v.entity}»`);
    console.log(`Індивідуальне правило № ${v.rule.number}: ${v.rule.text}`);
    if (values.write) {
      mkdirSync(new URL('data/', APP), { recursive: true });
      const dataFile = new URL('data/items.json', APP);
      const previous = existsSync(new URL('variant.json', APP)) ? JSON.parse(readFileSync(new URL('variant.json', APP), 'utf8')) : null;
      const items = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : [];
      // перший запис створюємо, якщо даних немає або там лише згенерований запис (наприклад, після зміни номера варіанту)
      const onlyGenerated = items.length === 0 || (items.length === 1 && String(items[0].title).startsWith('Запис '));
      writeFileSync(new URL('entity.json', APP), JSON.stringify(entityOf(v.number), null, 2) + '\n');
      writeFileSync(new URL('variant.json', APP), JSON.stringify(v, null, 2) + '\n');
      writeFileSync(new URL('fixtures.json', APP), JSON.stringify(fixturesOf(v.number, surname), null, 2) + '\n');
      if (onlyGenerated) writeFileSync(dataFile, JSON.stringify([firstRecord(v.number, surname)], null, 2) + '\n');
      console.log(`Записано: app/entity.json, app/variant.json, app/fixtures.json${onlyGenerated ? ', app/data/items.json' : ''}`);
      if (!onlyGenerated && previous && previous.number !== v.number) {
        console.warn('Увага: app/data/items.json містить записи попереднього варіанту – оновіть їх під нові поля вручну.');
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
