// Стан автентифікації застосунку React (практичне завдання № 6): Context + useReducer.
// Сесія потрібна багатьом компонентам (шапка, форма, кнопка видалення), тому вона зберігається не в окремому
// компоненті, а в контексті, і змінюється лише діями (actions) редуктора – так зміни стану передбачувані.
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { createApiClient } from '../../src/api/client.js';
import { createHttpStore } from '../../src/store/http-store.js';

export interface User { id: number; email: string; role: 'user' | 'admin' }
export interface Session { token: string; user: User }
type Action = { type: 'login'; session: Session } | { type: 'logout' };

const KEY = 'wp-demo-session';

/** Чиста функція: поточний стан + дія → новий стан. */
export function sessionReducer(_state: Session | null, action: Action): Session | null {
  switch (action.type) {
    case 'login': return action.session;
    case 'logout': return null;
  }
}

const loadSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); } catch { return null; }
};

interface AuthValue {
  session: Session | null;
  store: ReturnType<typeof createHttpStore>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, null, loadSession);
  // Клієнт API створюється один раз; актуальний токен він читає через ref, а не з замикання першого рендеру.
  const tokenRef = useRef(session?.token);
  tokenRef.current = session?.token;
  const client = useMemo(() => createApiClient(window.location.origin, { getToken: () => tokenRef.current }), []);
  const store = useMemo(() => createHttpStore(client), [client]);

  useEffect(() => {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
    else sessionStorage.removeItem(KEY);
  }, [session]);

  const value = useMemo<AuthValue>(() => ({
    session,
    store,
    async login(email, password) {
      const { token, user } = await client.request('/api/auth/login', { method: 'POST', body: { email, password } });
      dispatch({ type: 'login', session: { token, user } });
    },
    logout: () => dispatch({ type: 'logout' }),
  }), [session, store, client]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Хук доступу до сесії і сховища; поза AuthProvider – помилка розробника. */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth() викликано поза <AuthProvider>');
  return value;
}
