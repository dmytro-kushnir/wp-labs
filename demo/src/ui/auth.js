// @ts-check
// Вхід користувача на сторінці (практичне завдання № 5). Токен зберігається в sessionStorage:
// він зникає після закриття вкладки і недоступний іншим сайтам, але доступний скриптам цієї сторінки,
// тому захист від XSS (textContent, CSP) тут обов’язковий. Альтернатива – cookie HttpOnly (розділ 5.1).

const KEY = 'wp-demo-session';

/** @typedef {{ token: string, user: { id: number, email: string, role: string } }} Session */

/** @returns {Session | null} */
export function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

/** @param {Session | null} session */
export function saveSession(session) {
  if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
  else sessionStorage.removeItem(KEY);
}

/**
 * Вхід через API: POST /api/auth/login.
 * @param {ReturnType<typeof import('../api/client.js').createApiClient>} client
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Session>}
 */
export async function login(client, email, password) {
  const { token, user } = await client.request('/api/auth/login', { method: 'POST', body: { email, password } });
  const session = { token, user };
  saveSession(session);
  return session;
}

/**
 * Кнопка входу/виходу в шапці і підпис з адресою та роллю користувача.
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} label
 * @param {Session | null} session
 */
export function renderSession(button, label, session) {
  button.hidden = false;
  button.textContent = session ? 'Вийти' : 'Увійти';
  label.textContent = session ? `${session.user.email} (${session.user.role === 'admin' ? 'адміністратор' : 'користувач'})` : '';
}
