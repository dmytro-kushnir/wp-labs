// @ts-check
// Форма створення і редагування книги (практичне завдання № 2): читання значень з потрібними типами,
// показ помилок біля полів. Помилки передаються також у Constraint Validation API (setCustomValidity),
// тож поле стає :invalid, а екранний диктор оголошує повідомлення через aria-describedby.

/** @typedef {import('../store/errors.js').FieldError} FieldError */

/** @param {HTMLFormElement} form @param {string} name */
const field = (form, name) => /** @type {HTMLInputElement | HTMLSelectElement} */ (form.elements.namedItem(name));

/**
 * Значення форми як об’єкт книги: числа – числами, прапорець – булевим, рядки без зайвих пробілів.
 * @param {HTMLFormElement} form
 */
export function readForm(form) {
  const data = new FormData(form);
  const text = (/** @type {string} */ name) => String(data.get(name) ?? '').trim();
  const number = (/** @type {string} */ name) => (text(name) === '' ? Number.NaN : Number(text(name)));
  return {
    title: text('title'),
    author: text('author'),
    year: number('year'),
    price: number('price'),
    isbn: text('isbn').replaceAll('-', ''),
    genre: text('genre'),
    receivedAt: text('receivedAt'),
    available: data.has('available'),
  };
}

/**
 * @param {HTMLFormElement} form
 * @param {Record<string, any>} book
 */
export function fillForm(form, book) {
  for (const name of ['title', 'author', 'year', 'price', 'isbn', 'genre', 'receivedAt']) {
    field(form, name).value = book[name] ?? '';
  }
  /** @type {HTMLInputElement} */ (field(form, 'available')).checked = Boolean(book.available);
}

/** @param {HTMLFormElement} form */
export function clearErrors(form) {
  for (const el of form.querySelectorAll('.error')) el.textContent = '';
  for (const el of form.querySelectorAll('[aria-invalid]')) {
    el.removeAttribute('aria-invalid');
    /** @type {HTMLInputElement} */ (el).setCustomValidity('');
  }
}

/**
 * Показує помилки біля полів; помилки без поля – під формою. Фокус переходить на перше хибне поле.
 * @param {HTMLFormElement} form
 * @param {FieldError[]} errors
 * @param {string} [general] - загальне повідомлення (наприклад, від сервера)
 */
export function showErrors(form, errors, general = '') {
  clearErrors(form);
  let first = null;
  for (const { field: name, message } of errors) {
    const input = name ? field(form, name) : null;
    const slot = form.querySelector(`#err-${name}`);
    if (!input || !slot) { general ||= message; continue; }
    slot.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setCustomValidity(message);
    first ??= input;
  }
  const formError = form.querySelector('#err-form');
  if (formError) formError.textContent = general;
  first?.focus();
}
