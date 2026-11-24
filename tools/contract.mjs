#!/usr/bin/env node
// Контрактні тести (практичні завдання № 4–6): запускає сервер на вільному порту з базою в пам’яті,
// чекає готовності, проганяє колекцію Postman засобом Newman і зупиняє сервер. Працює однаково локально і в CI.
//
// npm run contract                 – власний сервер app/server (ПЗ 4)
// npm run contract -- --mock       – mock-сервер з app/entity.json (перевірити fixtures.json ще до написання сервера)
// npm run contract -- --auth       – з перевірками автентифікації та ролей (ПЗ 5)
// npm run demo:contract            – демонстраційний сервер «Бібліотека»
// npm run contract -- --command "python -m uvicorn main:app --app-dir app/server-py --port {port}"
//                                  – сервер іншою мовою (FastAPI тощо): {port} замінюється вільним портом
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { parseCli } from './args.mjs';

// Newman використовує застарілий у Node.js 24 API (fs.F_OK); попередження не стосується тестів – вимикаємо його.
process.noDeprecation = true;
const { default: newman } = await import('newman');

const { values } = parseCli({
  options: {
    server: { type: 'string', default: 'app/server/src/server.ts' },
    fixtures: { type: 'string', default: 'app/fixtures.json' },
    entity: { type: 'string', default: 'app/entity.json' },
    data: { type: 'string', default: 'app/data/items.json' },
    mock: { type: 'boolean', default: false },
    auth: { type: 'boolean', default: false },
    command: { type: 'string' },
  },
}, 'npm run contract -- --mock');

if (!existsSync(values.fixtures)) {
  console.error(`Файл ${values.fixtures} не знайдено. Згенеруйте його: node tools/variant.mjs ПРІЗВИЩЕ --number N --write`);
  process.exit(1);
}

const freePort = () => new Promise((resolve) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
const args = values.mock
  ? ['tools/mock-server.mjs', '--entity', values.entity, '--data', values.data, '--port', String(port), '--delay', '0']
  : [values.server];
// --auth (ПЗ 5): одноразовий обліковий запис адміністратора для цього запуску
const admin = { email: 'contract-admin@example.com', password: `pw-${Math.random().toString(36).slice(2)}-${Date.now()}` };
const env = { ...process.env, PORT: String(port), DB_PATH: ':memory:', ADMIN_EMAIL: admin.email, ADMIN_PASSWORD: admin.password, JWT_SECRET: `contract-${Math.random().toString(36).slice(2)}-secret-0123456789` };
const server = values.command
  // окрема група процесів (крім Windows), щоб зупинити і оболонку, і запущений нею сервер
  ? spawn(values.command.replaceAll('{port}', String(port)), { shell: true, detached: process.platform !== 'win32', env, stdio: ['ignore', 'pipe', 'inherit'] })
  : spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'inherit'] });
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk; });
const stop = () => {
  if (server.exitCode !== null) return;
  if (values.command && process.platform !== 'win32') {
    try { process.kill(-server.pid); } catch { /* група вже завершилася */ }
  } else {
    server.kill();
  }
};
process.on('exit', stop);

// очікування готовності сервера (до 15 с)
let ready = false;
for (let i = 0; i < 75 && server.exitCode === null; i++) {
  try { ready = (await fetch(`${baseUrl}/api/health`)).ok; } catch { /* ще не запущено */ }
  if (ready) break;
  await new Promise((r) => setTimeout(r, 200));
}
if (!ready) {
  console.error(`Сервер не відповів на ${baseUrl}/api/health. Вивід сервера:\n${serverLog}`);
  process.exit(1);
}

const fixtures = JSON.parse(readFileSync(values.fixtures, 'utf8'));
newman.run({
  collection: JSON.parse(readFileSync(new URL('../contract/postman/catalog.postman_collection.json', import.meta.url), 'utf8')),
  iterationData: [fixtures],
  envVar: [
    { key: 'baseUrl', value: baseUrl }, { key: 'skipRule', value: values.mock ? '1' : '0' },
    { key: 'auth', value: values.auth ? '1' : '0' }, { key: 'adminEmail', value: admin.email }, { key: 'adminPassword', value: admin.password },
  ],
  reporters: ['cli'],
}, (error, summary) => {
  stop();
  if (error) { console.error(error.message); process.exit(1); }
  process.exit(summary.run.failures.length ? 1 : 0);
});
