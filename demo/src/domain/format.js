// Форматування даних для показу (практичне завдання № 1): вбудований Intl замість ручного форматування.

// Позначення валюти залежить від версії ICU (у різних браузерах і Node.js – «грн» або «₴»),
// тому форматуємо лише число, а позначення додаємо самі – результат однаковий у будь-якому середовищі.
const money = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long' });
const plural = new Intl.PluralRules('uk-UA');

/** 1234.5 → «1 234,50 грн» */
export const formatPrice = (value) => `${money.format(value)} грн`;

/** 9.3166 → «9,32 $» (приблизна ціна за курсом НБУ, ПЗ 3) */
export const formatUsd = (value) => `${money.format(value)} $`;

/** ISO-рядок або Date → «24 листопада 2026 р.» */
export const formatDate = (value) => date.format(new Date(value));

/**
 * Число з правильною формою слова: 1 книга, 3 книги, 5 книг.
 * @param {number} n
 * @param {{ one: string, few: string, many: string, other?: string }} forms
 */
export function pluralize(n, forms) {
  const form = forms[plural.select(n)] ?? forms.other ?? forms.many;
  return `${n} ${form}`;
}

const BOOK_FORMS = { one: 'книга', few: 'книги', many: 'книг', other: 'книги' };

/** Короткий підсумок для заголовка каталогу. */
export function catalogSummary({ count, available }) {
  return `${pluralize(count, BOOK_FORMS)}, з них доступно ${available}`;
}

/** Підсумок результату пошуку: «Знайдено: 5 книг». */
export const foundSummary = (total) => `Знайдено: ${pluralize(total, BOOK_FORMS)}`;
