// @ts-check
// HTTP-клієнт поверх Fetch API (практичне завдання № 3): базова адреса, параметри запиту,
// JSON, тайм-аут, скасування і перетворення помилок HTTP та мережі на StoreError.
import { StoreError } from '../store/errors.js';

/**
 * @typedef {object} RequestOptions
 * @property {string} [method]
 * @property {unknown} [body] - об’єкт, що буде надіслано як JSON
 * @property {Record<string, string | number | boolean | undefined>} [query]
 * @property {number} [timeout] - мс
 * @property {AbortSignal} [signal] - зовнішнє скасування (наприклад, новий пошук)
 */

/**
 * @param {string} baseUrl - наприклад, http://localhost:3000
 * @param {{ fetchFn?: typeof fetch, timeout?: number, getToken?: () => string | null | undefined }} [options]
 *   getToken - поточний токен доступу (ПЗ 5); якщо є, додається заголовок Authorization: Bearer
 */
export function createApiClient(baseUrl, { fetchFn = globalThis.fetch, timeout = 5000, getToken = () => null } = {}) {
  /**
   * @param {string} path
   * @param {RequestOptions} [options]
   * @returns {Promise<any>} розібране тіло відповіді або null для 204
   */
  async function request(path, { method = 'GET', body, query = {}, timeout: ms = timeout, signal } = {}) {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
    const signals = [AbortSignal.timeout(ms)];
    if (signal) signals.push(signal);

    /** @type {Record<string, string>} */
    const headers = body === undefined ? {} : { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetchFn(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.any(signals),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError') throw new StoreError('Сервер не відповів вчасно', { code: 'TIMEOUT' });
      if (name === 'AbortError') throw error;            // запит скасовано навмисно – це не помилка для користувача
      throw new StoreError('Немає з’єднання з сервером', { code: 'NETWORK' });
    }

    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new StoreError(data?.error?.message ?? `Помилка HTTP ${response.status}`, {
        status: response.status,
        code: data?.error?.code ?? 'HTTP_ERROR',
        details: data?.error?.details ?? [],
      });
    }
    return data;
  }

  return { request };
}
