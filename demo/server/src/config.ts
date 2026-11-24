// Налаштування сервера зі змінних середовища (практичне завдання № 4): ті самі файли коду працюють
// на ноутбуці, у тестах і в контейнері (ПЗ 6) – змінюються лише значення змінних.
import { fileURLToPath } from 'node:url';

export interface Config {
  port: number;
  host: string;            // 127.0.0.1 – лише цей комп’ютер; 0.0.0.0 – доступ з локальної мережі (наприклад, для плати ESP32)
  dbPath: string;          // файл SQLite або ':memory:' для тестів
  corsOrigin: string;      // джерело сторінки, якій дозволено звертатися до API
  jwtSecret: string;       // ключ підпису токенів (ПЗ 5); у реальному розгортанні – лише зі змінної середовища
  adminEmail: string;      // обліковий запис адміністратора, що створюється під час першого запуску
  adminPassword: string;
}

const DEV_SECRET = 'dev-secret-change-me-dev-secret-change-me';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '127.0.0.1',
    dbPath: env.DB_PATH ?? fileURLToPath(new URL('../data/catalog.db', import.meta.url)),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5181',
    jwtSecret: env.JWT_SECRET ?? DEV_SECRET,
    adminEmail: env.ADMIN_EMAIL ?? 'admin@example.com',
    adminPassword: env.ADMIN_PASSWORD ?? 'admin-password',
  };
}

/** Попередження про небезпечні значення за замовчуванням (ПЗ 5): у CI і контейнері їх задають змінними середовища. */
export function insecureDefaults(config: Config): string[] {
  const warnings: string[] = [];
  if (config.jwtSecret === DEV_SECRET) warnings.push('JWT_SECRET не задано – використовується ключ для розроблення');
  if (config.adminPassword === 'admin-password') warnings.push('ADMIN_PASSWORD не задано – пароль адміністратора за замовчуванням');
  return warnings;
}
