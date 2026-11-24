// ПЗ 1. Операції над каталогом. Усі функції чисті: не змінюють вхідний масив і повертають новий результат.

/**
 * Пошук і фільтрація.
 * @param {object[]} items
 * @param {object} [filters] - { q, ...фільтри за полями варіанту }
 */
export function filterItems(items, filters = {}) {
  // TODO: пошук без урахування регістру за назвою + щонайменше два фільтри за полями варіанту
  return items;
}

/**
 * Сортування за полем; рядки порівнювати з localeCompare(…, 'uk').
 * @param {object[]} items
 * @param {string} [field]
 * @param {'asc'|'desc'} [order]
 */
export function sortItems(items, field = 'title', order = 'asc') {
  // TODO: toSorted() замість sort()
  return items;
}

/** Статистика каталогу: кількість, середнє/сума числового поля, розподіл за категоріями (Object.groupBy). */
export function catalogStats(items) {
  // TODO
  return { count: items.length };
}

/**
 * Поділ на сторінки (готово – використовуйте як є).
 * @returns {{ items: object[], page: number, pages: number, total: number }}
 */
export function paginate(items, page = 1, limit = 10) {
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * limit, current * limit), page: current, pages, total: items.length };
}
