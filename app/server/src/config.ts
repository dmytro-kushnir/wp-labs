// Налаштування сервера зі змінних середовища (практичне завдання № 4): ті самі файли коду працюють
// на ноутбуці, у тестах і в контейнері (ПЗ 6) – змінюються лише значення змінних.
import { fileURLToPath } from 'node:url';

export interface Config {
  port: number;
  host: string;            // 127.0.0.1 – лише цей комп’ютер; 0.0.0.0 – доступ з локальної мережі (наприклад, для плати ESP32)
  dbPath: string;          // файл SQLite або ':memory:' для тестів
  corsOrigin: string;      // джерело сторінки, якій дозволено звертатися до API
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
    dbPath: env.DB_PATH ?? fileURLToPath(new URL('../data/catalog.db', import.meta.url)),
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5180',
  };
}
