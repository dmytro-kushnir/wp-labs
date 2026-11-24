// @ts-check
// Відкладений виклик (практичне завдання № 3): функція виконується лише після паузи у викликах,
// тож під час набору тексту в пошуку сервер отримує один запит, а не запит на кожну літеру.

/**
 * @template {unknown[]} A
 * @param {(...args: A) => void} fn
 * @param {number} [ms]
 * @returns {(...args: A) => void}
 */
export function debounce(fn, ms = 300) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
