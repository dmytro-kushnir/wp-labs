// @ts-check
// Курс долара НБУ (практичне завдання № 3): публічний API без ключа, дозволяє запити з будь-якого
// джерела (Access-Control-Allow-Origin: *), тому його можна викликати прямо з браузера.

const URL_USD = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';

/**
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<{ rate: number, date: string }>} гривень за 1 USD і дата курсу
 */
export async function fetchUsdRate(fetchFn = globalThis.fetch) {
  const response = await fetchFn(URL_USD, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`НБУ: HTTP ${response.status}`);
  const [row] = await response.json();
  if (!row || typeof row.rate !== 'number') throw new Error('НБУ: неочікуваний формат відповіді');
  return { rate: row.rate, date: row.exchangedate };
}
