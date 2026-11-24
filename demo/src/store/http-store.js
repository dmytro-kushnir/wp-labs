// @ts-check
// Сховище каталогу на сервері (практичне завдання № 3): той самий інтерфейс, що й createLocalStore,
// але дані зберігає API за контрактом contract/openapi.yaml (mock-сервер у ПЗ 3, власний сервер у ПЗ 4).

/** @typedef {import('./local-store.js').ListQuery} ListQuery */
/** @typedef {import('./local-store.js').ItemPage} ItemPage */

/** @param {ReturnType<typeof import('../api/client.js').createApiClient>} client */
export function createHttpStore(client) {
  return {
    /** @param {ListQuery} [query] @returns {Promise<ItemPage>} */
    list: ({ signal, ...query } = {}) => client.request('/api/items', { query, signal }),

    /** @param {number} id */
    get: (id) => client.request(`/api/items/${id}`),

    /** @param {object} data */
    create: (data) => client.request('/api/items', { method: 'POST', body: data }),

    /** @param {number} id @param {object} data */
    update: (id, data) => client.request(`/api/items/${id}`, { method: 'PUT', body: data }),

    /** @param {number} id */
    remove: (id) => client.request(`/api/items/${id}`, { method: 'DELETE' }),
  };
}
