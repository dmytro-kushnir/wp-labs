// Перевірка даних книги (практичне завдання № 1). Ту саму функцію використовують форма (ПЗ 2)
// і HTTP-клієнт (ПЗ 3), тому вона чиста: не звертається до DOM, мережі чи поточного часу –
// поточну дату та інші записи каталогу передають параметрами.
import { GENRES } from './book.js';

/**
 * Перевіряє контрольну цифру ISBN-13: цифри множать почергово на 1 і 3,
 * сума разом з контрольною цифрою має ділитися на 10.
 * @param {string} isbn - 13 цифр без дефісів
 */
export function isValidIsbn13(isbn) {
  if (typeof isbn !== 'string' || !/^97[89]\d{10}$/.test(isbn)) return false;
  const sum = [...isbn].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

/** Дата у форматі РРРР-ММ-ДД, що справді існує (2027-02-30 – ні). */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Порівняння назв для правила унікальності: без урахування регістру і пробілів по краях. */
const sameTitle = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * @param {object} data - дані книги
 * @param {{ today?: string, existing?: object[] }} [options]
 *   today - поточна дата РРРР-ММ-ДД; existing - інші книги каталогу (для індивідуального правила)
 * @returns {{ field: string, message: string }[]} список помилок; порожній - дані коректні
 */
export function validateBook(data, { today = new Date().toISOString().slice(0, 10), existing = [] } = {}) {
  const currentYear = Number(today.slice(0, 4));
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const { id, title, author, year, isbn, genre, price, available, receivedAt } = data ?? {};

  if (typeof title !== 'string' || title.trim() === '') add('title', 'Вкажіть назву книги');
  else if (title.length > 200) add('title', 'Назва не довша за 200 символів');

  if (typeof author !== 'string' || author.trim() === '') add('author', 'Вкажіть автора');
  else if (author.length > 100) add('author', 'Ім’я автора не довше за 100 символів');

  if (!Number.isInteger(year) || year < 1450 || year > currentYear) {
    add('year', `Рік має бути цілим числом від 1450 до ${currentYear}`);
  }

  if (!isValidIsbn13(isbn)) add('isbn', 'Неправильний ISBN-13 (13 цифр, контрольна цифра)');

  if (!Object.hasOwn(GENRES, genre)) add('genre', 'Оберіть жанр зі списку');

  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) add('price', 'Вартість – невід’ємне число');

  if (typeof available !== 'boolean') add('available', 'Вкажіть, чи доступна книга');

  if (!isIsoDate(receivedAt)) add('receivedAt', 'Вкажіть дату надходження');
  else if (receivedAt > today) add('receivedAt', 'Дата надходження не може бути в майбутньому');   // рядки РРРР-ММ-ДД порівнюються як дати

  // Індивідуальне правило демо-варіанту (прізвище PETRENKO, S = 104 → правило № 1):
  // назва унікальна в каталозі без урахування регістру; запис, що редагується, сам із собою не порівнюється.
  if (typeof title === 'string' && existing.some((b) => b.id !== id && sameTitle(b.title, title))) {
    add('title', 'Книга з такою назвою вже є в каталозі');
  }

  return errors;
}
