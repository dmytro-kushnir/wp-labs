// Операції над каталогом (практичне завдання № 1): усі функції чисті – не змінюють вхідний масив
// і повертають новий результат, тому їх легко тестувати і повторно використовувати в інтерфейсі.

/**
 * Пошук і фільтрація.
 * @param {object[]} books
 * @param {{ q?: string, genre?: string, available?: boolean, yearFrom?: number, yearTo?: number }} [filters]
 */
export function filterBooks(books, { q = '', genre, available, yearFrom = -Infinity, yearTo = Infinity } = {}) {
  const needle = q.trim().toLowerCase();
  return books.filter((b) =>
    (needle === '' || b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle))
    && (genre === undefined || b.genre === genre)
    && (available === undefined || b.available === available)
    && b.year >= yearFrom && b.year <= yearTo);
}

const compare = (x, y) => (typeof x === 'string' ? x.localeCompare(y, 'uk') : Number(x) - Number(y));

/**
 * Сортування за полем; toSorted() повертає новий масив і не змінює вихідний.
 * @param {object[]} books
 * @param {string} [field]
 * @param {'asc'|'desc'} [order]
 */
export function sortBooks(books, field = 'title', order = 'asc') {
  const dir = order === 'desc' ? -1 : 1;
  return books.toSorted((a, b) => compare(a[field], b[field]) * dir);
}

/** Групування за жанром: { fiction: [...], poetry: [...] }. */
export function groupByGenre(books) {
  return Object.groupBy(books, (b) => b.genre);
}

/** Зведена статистика каталогу. */
export function catalogStats(books) {
  if (books.length === 0) {
    return { count: 0, available: 0, averageYear: null, totalPrice: 0, byGenre: {} };
  }
  const totalYears = books.reduce((sum, b) => sum + b.year, 0);
  return {
    count: books.length,
    available: books.filter((b) => b.available).length,
    averageYear: Math.round(totalYears / books.length),
    totalPrice: books.reduce((sum, b) => sum + b.price, 0),
    byGenre: Object.fromEntries(Object.entries(groupByGenre(books)).map(([genre, list]) => [genre, list.length])),
  };
}

/**
 * Поділ на сторінки; номер сторінки обмежується допустимим діапазоном.
 * @returns {{ items: object[], page: number, pages: number, total: number }}
 */
export function paginate(items, page = 1, limit = 10) {
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * limit, current * limit), page: current, pages, total: items.length };
}
