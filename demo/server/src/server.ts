// Точка входу сервера (практичне завдання № 4): npm run demo:server
import { readFileSync } from 'node:fs';
import { insecureDefaults, loadConfig } from './config.ts';
import { hashPassword } from './auth.ts';
import { createUsers } from './users.ts';
import { openDatabase } from './db.ts';
import { createApp } from './app.ts';
import { createRepository } from './repository.ts';
import { BookInput } from './schema.ts';

const config = loadConfig();
const db = openDatabase(config.dbPath);

// Перший запуск: порожню базу заповнюємо початковими даними каталогу.
const repo = createRepository(db);
if (repo.count() === 0) {
  const seed = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url), 'utf8')) as unknown[];
  for (const item of seed) repo.create(BookInput.parse(item));
  console.log(`База даних: створено записів – ${seed.length} (data/items.json)`);
}

// Перший запуск: обліковий запис адміністратора з ADMIN_EMAIL / ADMIN_PASSWORD (ПЗ 5).
const users = createUsers(db);
if (!users.findForLogin(config.adminEmail)) {
  users.create(config.adminEmail, await hashPassword(config.adminPassword), 'admin');
  console.log(`Створено адміністратора ${config.adminEmail}`);
}
for (const warning of insecureDefaults(config)) console.warn(`Увага: ${warning}`);

const server = createApp({ db, corsOrigin: config.corsOrigin, jwtSecret: config.jwtSecret }).listen(config.port, config.host, () => {
  console.log(`API: http://localhost:${config.port}/api/items   документація: http://localhost:${config.port}/docs`);
  console.log(`База даних: ${config.dbPath}; дозволене джерело CORS: ${config.corsOrigin}. Зупинити – Ctrl+C`);
});
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? `Порт ${config.port} уже зайнятий (можливо, запущено mock-сервер). Зупиніть його або задайте PORT.` : error.message);
  process.exit(1);
});
// Коректне завершення: закриваємо з’єднання і базу даних.
process.on('SIGINT', () => server.close(() => { db.close(); process.exit(0); }));
