// @ts-check
// Формування DOM (практичне завдання № 2). Дані користувача вставляються лише через textContent,
// а не innerHTML: так рядок на зразок <img onerror=...> залишається текстом і не виконується (XSS, розділ 5).
import { Book, GENRES } from '../domain/book.js';
import { formatPrice, formatUsd } from '../domain/format.js';

/**
 * Заповнює <select> жанрами, зберігаючи перший пункт («Усі» / «Оберіть»).
 * @param {HTMLSelectElement} select
 */
export function renderGenreOptions(select) {
  for (const [value, label] of Object.entries(GENRES)) {
    select.append(new Option(label, value));
  }
}

/**
 * @param {HTMLUListElement} list
 * @param {HTMLTemplateElement} template
 * @param {object[]} items
 * @param {{ usdRate?: number }} [options] - курс НБУ для приблизної ціни в доларах (ПЗ 3)
 */
export function renderList(list, template, items, { usdRate } = {}) {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const book = Book.from(item);
    const card = /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
    card.dataset.id = String(book.id);
    card.dataset.available = String(book.available);
    const set = (/** @type {string} */ selector, /** @type {string} */ text) => {
      const el = card.querySelector(selector);
      if (el) el.textContent = text;
    };
    set('.card-title', book.title);
    set('.card-author', book.author);
    set('.card-meta', `${book.genreLabel} · ${book.year}${book.isClassic() ? ' · класика' : ''}`);
    set('.card-price', usdRate ? `${formatPrice(book.price)} (≈ ${formatUsd(book.price / usdRate)})` : formatPrice(book.price));
    set('[data-action="toggle"]', book.available ? 'Видати' : 'Повернути');
    fragment.append(card);
  }
  list.replaceChildren(fragment);
}

/**
 * @param {HTMLElement} info
 * @param {NodeListOf<HTMLButtonElement>} buttons - кнопки з data-page="prev" / "next"
 * @param {{ page: number, limit: number, total: number }} page
 */
export function renderPager(info, buttons, { page, limit, total }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  info.textContent = `Сторінка ${page} з ${pages}`;
  for (const button of buttons) {
    button.disabled = button.dataset.page === 'prev' ? page <= 1 : page >= pages;
  }
}

/**
 * Рядок стану під панеллю фільтрів: завантаження, порожній результат або помилка з кнопкою повтору.
 * @param {HTMLElement} el
 * @param {{ kind: 'idle' | 'loading' | 'empty' | 'error', message?: string, onRetry?: () => void }} state
 */
export function renderStatus(el, { kind, message = '', onRetry }) {
  el.classList.toggle('error', kind === 'error');
  el.textContent = { idle: '', loading: 'Завантаження…', empty: 'Нічого не знайдено', error: message }[kind];
  if (kind === 'error' && onRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Спробувати ще раз';
    retry.addEventListener('click', onRetry, { once: true });
    el.append(' ', retry);
  }
}
