#!/usr/bin/env node
// Сервер сторінок для практичних завдань № 2–3: ES-модулі не завантажуються з file://,
// тому сторінку відкривають через HTTP. Без залежностей.
//
// npm run dev        – застосунок студента (каталог app/), http://localhost:5180
// npm run demo:dev   – демонстраційний варіант (каталог demo/), http://localhost:5181
// --no-csp           – без заголовка Content-Security-Policy (лише для навчальної сторінки XSS, ПЗ 5)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseCli } from './args.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

const { values } = parseCli({ allowNegative: true, options: { root: { type: 'string', default: 'app' }, port: { type: 'string', default: '5180' }, csp: { type: 'boolean', default: true } } }, 'node tools/serve.mjs --root app --port 5180');
const root = resolve(values.root);
const port = Number(values.port);

/**
 * Політика безпеки вмісту (ПЗ 5): скрипти й стилі – лише з файлів цього сервера, без вбудованих обробників
 * на зразок onerror="…", запити – до локальних API і НБУ. Навіть якщо зловмисник вставить розмітку на сторінку,
 * браузер не виконає її скрипт.
 */
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:",
  "connect-src 'self' http://localhost:* http://127.0.0.1:* https://bank.gov.ua",
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ');

const server = createServer(async (req, res) => {
  const notFound = (text) => res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(text);
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    let file = normalize(join(root, decodeURIComponent(pathname)));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }   // не виходимо за межі каталогу
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(values.csp ? { 'Content-Security-Policy': CSP } : {}),
    });
    res.end(body);
  } catch (error) {
    if (error instanceof URIError) { res.writeHead(400).end(); return; }
    notFound(req.url === '/' ? `У каталозі ${root} немає index.html` : `404: ${req.url}`);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Порт ${port} уже зайнятий іншою програмою (можливо, сервер уже запущено в іншому терміналі).`);
    console.error(`Зупиніть її або оберіть інший порт: --port ${port + 1}`);
  } else {
    console.error(`Не вдалося запустити сервер: ${error.message}`);
  }
  process.exit(1);
});

// Лише цей комп’ютер: інші пристрої в тій самій Wi-Fi-мережі не бачать файлів проєкту.
server.listen(port, '127.0.0.1', () => console.log(`Сторінка: http://localhost:${port}/  (каталог ${root}${values.csp ? '' : ', БЕЗ CSP'}). Зупинити – Ctrl+C`));
