// Точка входу сервера (практичне завдання № 4): npm run server
import { readFileSync } from 'node:fs';
import { loadConfig } from './config.ts';
import { openDatabase } from './db.ts';
import { createApp } from './app.ts';
import { createRepository } from './repository.ts';
import { ItemInput } from './schema.ts';

const config = loadConfig();
const db = openDatabase(config.dbPath);

// Перший запуск: порожню базу заповнюємо початковими даними каталогу (app/data/items.json).
const repo = createRepository(db);
if (repo.count() === 0) {
  const seed = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url), 'utf8')) as unknown[];
  try {
    for (const item of seed) repo.create(ItemInput.parse(item));
    console.log(`База даних: створено записів – ${seed.length} (app/data/items.json)`);
  } catch (error) {
    console.warn(`Початкові дані не завантажено: ${(error as Error).message}`);
  }
}

const server = createApp({ db, corsOrigin: config.corsOrigin }).listen(config.port, config.host, () => {
  console.log(`API: http://localhost:${config.port}/api/items   документація: http://localhost:${config.port}/docs`);
  console.log(`База даних: ${config.dbPath}; дозволене джерело CORS: ${config.corsOrigin}. Зупинити – Ctrl+C`);
});
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? `Порт ${config.port} уже зайнятий (можливо, запущено mock-сервер). Зупиніть його або задайте PORT.` : error.message);
  process.exit(1);
});
process.on('SIGINT', () => server.close(() => { db.close(); process.exit(0); }));
