// @ts-check
// Точка входу сторінки каталогу (практичні завдання № 2–3): стан фільтрів, події, виклики сховища.
//   http://localhost:5173/                              – дані в localStorage (ПЗ 2)
//   http://localhost:5173/?api=http://localhost:3000    – дані на сервері (ПЗ 3: mock, ПЗ 4: власний API)
import seed from '../../data/items.json' with { type: 'json' };
import { foundSummary } from '../domain/format.js';
import { validateBook } from '../domain/validate.js';
import { createApiClient } from '../api/client.js';
import { fetchUsdRate } from '../api/nbu.js';
import { createLocalStore } from '../store/local-store.js';
import { createHttpStore } from '../store/http-store.js';
import { StoreError } from '../store/errors.js';
import { debounce } from './debounce.js';
import { loadSession, login, renderSession, saveSession } from './auth.js';
import { clearErrors, fillForm, readForm, showErrors } from './form.js';
import { renderGenreOptions, renderList, renderPager, renderStatus } from './render.js';

/** Знаходить елемент за селектором; відсутній елемент – помилка розмітки, тому одразу виняток. */
const $ = (/** @type {string} */ selector) => {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Елемент ${selector} не знайдено`);
  return /** @type {any} */ (el);
};

const ui = {
  /** @type {HTMLParagraphElement} */ summary: $('#summary'),
  /** @type {HTMLFormElement} */ filters: $('#filters'),
  /** @type {HTMLDivElement} */ status: $('#status'),
  /** @type {HTMLUListElement} */ list: $('#list'),
  /** @type {HTMLTemplateElement} */ template: $('#card-tpl'),
  /** @type {HTMLSpanElement} */ pageInfo: $('#page-info'),
  /** @type {NodeListOf<HTMLButtonElement>} */ pageButtons: document.querySelectorAll('[data-page]'),
  /** @type {HTMLDialogElement} */ editor: $('#editor'),
  /** @type {HTMLFormElement} */ form: $('#book-form'),
  /** @type {HTMLHeadingElement} */ editorTitle: $('#editor-title'),
  /** @type {HTMLButtonElement} */ loginButton: $('#login-btn'),
  /** @type {HTMLSpanElement} */ userLabel: $('#user-label'),
  /** @type {HTMLDialogElement} */ loginDialog: $('#login-dialog'),
  /** @type {HTMLFormElement} */ loginForm: $('#login-form'),
};

const apiUrl = new URLSearchParams(location.search).get('api');
let session = loadSession();
const client = apiUrl ? createApiClient(apiUrl, { getToken: () => session?.token }) : null;
const store = client ? createHttpStore(client) : createLocalStore(seed);

/** Поточний стан сторінки: фільтри, сортування і номер сторінки. */
const state = {
  q: '',
  /** @type {string | undefined} */ genre: undefined,
  /** @type {boolean | undefined} */ available: undefined,
  sort: 'title',
  /** @type {'asc' | 'desc'} */ order: 'asc',
  page: 1,
  limit: 6,
  /** @type {number | null} – id книги, що редагується; null – нова книга */ editingId: null,
  /** @type {number | undefined} */ usdRate: undefined,
};

/** Скасування попереднього запиту списку: відповідь на старий пошук не перезапише новий результат. */
/** @type {AbortController | undefined} */
let listRequest;

/** Останній отриманий список – щоб перемалювати картки (наприклад, з курсом НБУ) без повторного запиту. */
/** @type {any[]} */
let shownItems = [];

async function refresh() {
  listRequest?.abort();
  listRequest = new AbortController();
  renderStatus(ui.status, { kind: 'loading' });
  try {
    const { q, genre, available, sort, order, page, limit } = state;
    const result = await store.list({ q, genre, available, sort, order, page, limit, signal: listRequest.signal });
    state.page = result.page;   // сховище могло замінити номер сторінки (наприклад, після видалення останньої картки)
    shownItems = result.items;
    renderList(ui.list, ui.template, result.items, { usdRate: state.usdRate });
    renderPager(ui.pageInfo, ui.pageButtons, result);
    ui.summary.textContent = foundSummary(result.total);
    renderStatus(ui.status, { kind: result.total === 0 ? 'empty' : 'idle' });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    for (const button of ui.pageButtons) button.disabled = true;
    renderStatus(ui.status, { kind: 'error', message: errorMessage(error), onRetry: refresh });
  }
}

/** @param {unknown} error */
const errorMessage = (error) => (error instanceof StoreError ? error.message : 'Сталася непередбачена помилка');

/**
 * Відповідь 401 (немає або прострочений токен) – пропонуємо увійти (ПЗ 5).
 * @param {unknown} error
 * @returns {boolean} true – помилку оброблено
 */
function handleAuthError(error) {
  if (!(error instanceof StoreError) || error.status !== 401) return false;
  session = null;
  saveSession(null);
  renderSession(ui.loginButton, ui.userLabel, session);
  ui.loginDialog.showModal();
  return true;
}

// ---------------------------------------------------------------- фільтри
function readFilters() {
  const data = new FormData(ui.filters);
  const [sort, order] = String(data.get('sort')).split(':');
  state.q = String(data.get('q') ?? '');
  state.genre = String(data.get('genre') ?? '') || undefined;
  state.available = data.has('available') ? true : undefined;
  state.sort = sort;
  state.order = order === 'desc' ? 'desc' : 'asc';
  state.page = 1;
  refresh();
}
const readFiltersDebounced = debounce(readFilters, 300);

ui.filters.addEventListener('input', (event) => {
  // текст пошуку – з паузою (ПЗ 3), списки і прапорець – одразу
  if (event.target instanceof HTMLInputElement && event.target.type === 'search') readFiltersDebounced();
  else readFilters();
});
ui.filters.addEventListener('submit', (event) => event.preventDefault());

for (const button of ui.pageButtons) {
  button.addEventListener('click', () => {
    state.page += button.dataset.page === 'next' ? 1 : -1;
    refresh();
  });
}

// ---------------------------------------------------------------- дії з карткою: одне делегування на весь список
ui.list.addEventListener('click', async (event) => {
  const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
  const card = button?.closest('.card');
  if (!(button instanceof HTMLButtonElement) || !(card instanceof HTMLElement)) return;
  const id = Number(card.dataset.id);
  try {
    if (button.dataset.action === 'edit') {
      openEditor(await store.get(id));
    } else if (button.dataset.action === 'toggle') {
      const book = await store.get(id);
      await store.update(id, { ...book, available: !book.available });
      refresh();
    } else if (button.dataset.action === 'delete') {
      const book = await store.get(id);
      if (confirm(`Видалити «${book.title}»?`)) {
        await store.remove(id);
        refresh();
      }
    }
  } catch (error) {
    if (!handleAuthError(error)) renderStatus(ui.status, { kind: 'error', message: errorMessage(error), onRetry: refresh });
  }
});

// ---------------------------------------------------------------- форма
/** @param {Record<string, any> | null} book */
function openEditor(book) {
  state.editingId = book?.id ?? null;
  ui.editorTitle.textContent = book ? 'Редагування книги' : 'Нова книга';
  ui.form.reset();
  clearErrors(ui.form);
  if (book) fillForm(ui.form, book);
  ui.editor.showModal();
}

$('#add-btn').addEventListener('click', () => openEditor(null));
ui.form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => ui.editor.close());

/**
 * Кандидати для індивідуального правила (унікальна назва): сервер віддає дані сторінками,
 * тому запитуємо лише книги, у назві яких є введений текст, а точний збіг перевіряє validateBook.
 * @param {string} title
 */
const booksWithSimilarTitle = async (title) => (await store.list({ q: title.trim(), limit: 100 })).items;

ui.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = readForm(ui.form);
  const submit = /** @type {HTMLButtonElement} */ (ui.form.querySelector('[type="submit"]'));
  submit.disabled = true;
  try {
    const existing = data.title ? await booksWithSimilarTitle(data.title) : [];
    const errors = validateBook({ ...data, id: state.editingId }, { existing });
    if (errors.length) {
      showErrors(ui.form, errors);
      return;
    }
    if (state.editingId === null) await store.create(data);
    else await store.update(state.editingId, data);
    ui.editor.close();
    refresh();
  } catch (error) {
    if (handleAuthError(error)) return;
    // помилки валідації сервера показуємо біля полів так само, як власні
    if (error instanceof StoreError) showErrors(ui.form, error.details, error.details.length ? '' : error.message);
    else showErrors(ui.form, [], errorMessage(error));
  } finally {
    submit.disabled = false;
  }
});

// ---------------------------------------------------------------- вхід (ПЗ 5; лише з сервером API)
if (client) {
  renderSession(ui.loginButton, ui.userLabel, session);
  ui.loginButton.addEventListener('click', () => {
    if (session) {
      session = null;
      saveSession(null);
      renderSession(ui.loginButton, ui.userLabel, session);
    } else {
      ui.loginForm.reset();
      ui.loginDialog.showModal();
    }
  });
  ui.loginForm.querySelector('[data-action="cancel"]')?.addEventListener('click', () => ui.loginDialog.close());
  ui.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(ui.loginForm);
    const message = /** @type {HTMLElement} */ (ui.loginForm.querySelector('#err-login'));
    try {
      session = await login(client, String(data.get('email')), String(data.get('password')));
      renderSession(ui.loginButton, ui.userLabel, session);
      ui.loginDialog.close();
    } catch (error) {
      message.textContent = errorMessage(error);
    }
  });
}

// ---------------------------------------------------------------- старт
renderGenreOptions(/** @type {HTMLSelectElement} */ (ui.filters.elements.namedItem('genre')));
renderGenreOptions(/** @type {HTMLSelectElement} */ (ui.form.elements.namedItem('genre')));
/** @type {HTMLInputElement} */ (ui.form.elements.namedItem('year')).max = String(new Date().getFullYear());
refresh();

// Курс НБУ не є критичним: якщо API недоступне, ціни показуються лише в гривнях (ПЗ 3).
fetchUsdRate()
  .then(({ rate }) => {
    state.usdRate = rate;
    renderList(ui.list, ui.template, shownItems, { usdRate: rate });
  })
  .catch((error) => console.warn('Курс НБУ недоступний:', error.message));
