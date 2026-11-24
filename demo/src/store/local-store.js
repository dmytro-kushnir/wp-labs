// @ts-check
// Сховище каталогу в localStorage браузера (практичне завдання № 2).
// Методи асинхронні, хоча localStorage синхронний: так інтерфейс сховища збігається з HTTP-сховищем (ПЗ 3)
// і код сторінки не потрібно змінювати під час переходу на сервер.
import { filterBooks, paginate, sortBooks } from '../domain/catalog.js';
import { validateBook } from '../domain/validate.js';
import { StoreError } from './errors.js';

const KEY = 'wp-demo-library';

/**
 * @typedef {{ q?: string, genre?: string, available?: boolean, sort?: string, order?: 'asc'|'desc', page?: number, limit?: number, signal?: AbortSignal }} ListQuery
 * @typedef {{ items: any[], total: number, page: number, limit: number }} ItemPage
 */

/**
 * @param {any[]} seed - початкові дані, якщо сховище ще порожнє
 * @param {Pick<Storage, 'getItem' | 'setItem'>} [storage] - можна підставити імітацію для тестів
 */
export function createLocalStore(seed, storage = globalThis.localStorage) {
  /** @returns {any[]} */
  const load = () => {
    const raw = storage.getItem(KEY);
    return raw ? JSON.parse(raw) : structuredClone(seed);
  };
  /** @param {any[]} items */
  const save = (items) => storage.setItem(KEY, JSON.stringify(items));

  /** @param {any[]} items @param {number} id */
  const indexOf = (items, id) => {
    const i = items.findIndex((b) => b.id === id);
    if (i === -1) throw new StoreError(`Запис ${id} не знайдено`, { status: 404, code: 'NOT_FOUND' });
    return i;
  };

  /** @param {Record<string, any>} data @param {any[]} existing */
  const check = (data, existing) => {
    const details = validateBook(data, { existing });
    if (details.length) throw new StoreError('Дані не пройшли перевірку', { status: 400, code: 'VALIDATION_ERROR', details });
  };

  return {
    /** @param {ListQuery} [query] @returns {Promise<ItemPage>} */
    async list({ q, genre, available, sort = 'title', order = 'asc', page = 1, limit = 10 } = {}) {
      const found = sortBooks(filterBooks(load(), { q, genre, available }), sort, order);
      const result = paginate(found, page, limit);
      return { items: result.items, total: result.total, page: result.page, limit };
    },

    /** @param {number} id */
    async get(id) {
      const items = load();
      return items[indexOf(items, id)];
    },

    /** @param {Record<string, any>} data */
    async create(data) {
      const items = load();
      check(data, items);
      const now = new Date().toISOString();
      const book = { ...data, id: Math.max(0, ...items.map((b) => b.id)) + 1, createdAt: now, updatedAt: now };
      save([...items, book]);
      return book;
    },

    /** @param {number} id @param {Record<string, any>} data */
    async update(id, data) {
      const items = load();
      const i = indexOf(items, id);
      check({ ...data, id }, items);
      const book = { ...data, id, createdAt: items[i].createdAt, updatedAt: new Date().toISOString() };
      save(items.with(i, book));
      return book;
    },

    /** @param {number} id */
    async remove(id) {
      const items = load();
      indexOf(items, id);
      save(items.filter((b) => b.id !== id));
      return null;
    },
  };
}
