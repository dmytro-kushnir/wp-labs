#!/usr/bin/env node
// Mock-сервер API каталогу за контрактом contract/openapi.yaml (практичне завдання № 3).
// Без залежностей – лише node:http. Дані зберігаються в пам’яті й відновлюються після перезапуску.
//
// npm run mock                      – застосунок студента (app/entity.json, app/data/items.json), порт 3000
// npm run mock -- --delay 1000      – затримка відповіді 1 с (типово 300 мс)
// npm run mock -- --fail-rate 0.3   – 30 % GET-запитів завершуються помилкою 503 (перевірка обробки збоїв)
import { createServer } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { parseCli } from './args.mjs';
import { fileURLToPath } from 'node:url';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'Location',
};
const RESERVED = new Set(['q', 'page', 'limit', 'sort', 'order']);

/** Дата у форматі РРРР-ММ-ДД, що справді існує (2027-02-30 – ні). */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Перевірка тіла запиту за описом сутності; повертає список { field, message }. */
export function validateInput(entity, body) {
  const errors = [];
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return [{ field: '', message: 'Тіло запиту має бути JSON-об’єктом' }];
  }
  const fields = { title: { type: 'string', required: true, minLength: 1, maxLength: 200 }, ...entity.fields };
  for (const [name, rule] of Object.entries(fields)) {
    const v = body[name];
    if (v === undefined || v === null || v === '') {
      if (rule.required) errors.push({ field: name, message: 'Поле обов’язкове' });
      continue;
    }
    const max = rule.max === 'currentYear' ? new Date().getFullYear() : rule.max;
    switch (rule.type) {
      case 'string':
        if (typeof v !== 'string') { errors.push({ field: name, message: 'Очікується рядок' }); break; }
        if (rule.minLength && v.trim().length < rule.minLength) errors.push({ field: name, message: `Мінімальна довжина – ${rule.minLength}` });
        if (rule.maxLength && v.length > rule.maxLength) errors.push({ field: name, message: `Максимальна довжина – ${rule.maxLength}` });
        if (rule.pattern && !new RegExp(rule.pattern).test(v)) errors.push({ field: name, message: 'Неправильний формат' });
        if (rule.enum && !rule.enum.includes(v)) errors.push({ field: name, message: `Допустимі значення: ${rule.enum.join(', ')}` });
        break;
      case 'integer':
      case 'number':
        if (typeof v !== 'number' || !Number.isFinite(v) || (rule.type === 'integer' && !Number.isInteger(v))) {
          errors.push({ field: name, message: rule.type === 'integer' ? 'Очікується ціле число' : 'Очікується число' });
          break;
        }
        if (rule.min !== undefined && v < rule.min) errors.push({ field: name, message: `Не менше ${rule.min}` });
        if (max !== undefined && v > max) errors.push({ field: name, message: `Не більше ${max}` });
        break;
      case 'boolean':
        if (typeof v !== 'boolean') errors.push({ field: name, message: 'Очікується true або false' });
        break;
      case 'date':
        if (!isIsoDate(v)) errors.push({ field: name, message: 'Очікується наявна дата у форматі РРРР-ММ-ДД' });
        break;
      default:
        break;
    }
  }
  return errors;
}

/** Значення параметра фільтра з рядка запиту; undefined – значення неправильне. */
function parseFilter(rule, raw) {
  if (rule.type === 'boolean') return raw === 'true' ? true : raw === 'false' ? false : undefined;
  if (rule.type === 'integer' || rule.type === 'number') {
    const n = Number(raw);
    return raw.trim() !== '' && Number.isFinite(n) ? n : undefined;
  }
  return raw;
}

/** Ціле додатне число з рядка запиту; undefined – параметр відсутній, NaN – неправильний. */
function positiveInt(raw) {
  if (raw === null) return undefined;
  return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : Number.NaN;
}

/** ?q, фільтри за полями, sort/order і page/limit; { error } – неправильний запит. */
export function queryItems(entity, items, params) {
  const fields = { id: { type: 'integer' }, title: { type: 'string' }, ...entity.fields };
  const searchable = ['title', ...Object.entries(entity.fields).filter(([, f]) => f.search).map(([k]) => k)];
  const q = (params.get('q') || '').trim().toLowerCase();
  let out = q ? items.filter((it) => searchable.some((k) => String(it[k] ?? '').toLowerCase().includes(q))) : [...items];

  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    if (!(key in fields)) return { error: `Невідомий параметр фільтра: ${key}` };
    const value = parseFilter(fields[key], raw);
    if (value === undefined) return { error: `Неправильне значення фільтра ${key}=${raw}` };
    out = out.filter((it) => it[key] === value);
  }

  const sort = params.get('sort') || 'id';
  if (sort !== 'createdAt' && !(sort in fields)) return { error: `Неможливо сортувати за полем: ${sort}` };
  const order = params.get('order') || 'asc';
  if (order !== 'asc' && order !== 'desc') return { error: 'order: asc або desc' };
  const dir = order === 'desc' ? -1 : 1;
  out.sort((a, b) => {
    const x = a[sort]; const y = b[sort];
    if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y, 'uk') * dir;
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });

  const limit = positiveInt(params.get('limit')) ?? 10;
  const requested = positiveInt(params.get('page')) ?? 1;
  if (Number.isNaN(limit) || limit > 100) return { error: 'limit: ціле число від 1 до 100' };
  if (Number.isNaN(requested)) return { error: 'page: ціле число від 1' };
  const page = Math.min(requested, Math.max(1, Math.ceil(out.length / limit)));   // як paginate() у ПЗ 1
  return { items: out.slice((page - 1) * limit, page * limit), total: out.length, page, limit };
}

export function createMockServer({ entity = { fields: {} }, seed = [], delay = 0, failRate = 0 } = {}) {
  let nextId = 1;
  const now = () => new Date().toISOString();
  const items = seed.map((s) => {
    const id = s.id ?? nextId;
    nextId = Math.max(nextId, id + 1);
    return { createdAt: now(), updatedAt: now(), ...s, id };
  });

  const send = (res, status, body, extra = {}) => {
    res.writeHead(status, { ...CORS_HEADERS, ...(body === undefined ? {} : JSON_HEADERS), ...extra });
    res.end(body === undefined ? undefined : JSON.stringify(body));
  };
  const fail = (res, status, code, message, details) => send(res, status, { error: { code, message, ...(details ? { details } : {}) } });

  const readBody = (req) => new Promise((resolve) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve({ ok: true, value: raw ? JSON.parse(raw) : undefined }); } catch { resolve({ ok: false }); }
    });
  });

  /** Дані запису з тіла запиту: службові поля id, createdAt, updatedAt ігноруються. */
  const dataOf = ({ id: _id, createdAt: _c, updatedAt: _u, ...data }) => data;

  const handle = async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return send(res, 204);
    if (path === '/api/health') return send(res, 200, { status: 'ok' });
    if (failRate > 0 && req.method === 'GET' && Math.random() < failRate) {
      return fail(res, 503, 'UNAVAILABLE', 'Сервер тимчасово недоступний (імітація збою)');
    }
    if (path === '/api/items') {
      if (req.method === 'GET') {
        const result = queryItems(entity, items, url.searchParams);
        return result.error ? fail(res, 400, 'BAD_QUERY', result.error) : send(res, 200, result);
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        if (!body.ok) return fail(res, 400, 'BAD_JSON', 'Тіло запиту не є коректним JSON');
        const errors = validateInput(entity, body.value);
        if (errors.length) return fail(res, 400, 'VALIDATION_ERROR', 'Дані не пройшли перевірку', errors);
        const item = { ...dataOf(body.value), id: nextId++, createdAt: now(), updatedAt: now() };
        items.push(item);
        return send(res, 201, item, { Location: `/api/items/${item.id}` });
      }
      return fail(res, 405, 'METHOD_NOT_ALLOWED', `Метод ${req.method} не підтримується`);
    }
    const m = path.match(/^\/api\/items\/(\d+)$/);
    if (m) {
      const idx = items.findIndex((it) => it.id === Number(m[1]));
      if (idx === -1) return fail(res, 404, 'NOT_FOUND', `Запис ${m[1]} не знайдено`);
      if (req.method === 'GET') return send(res, 200, items[idx]);
      if (req.method === 'PUT') {
        const body = await readBody(req);
        if (!body.ok) return fail(res, 400, 'BAD_JSON', 'Тіло запиту не є коректним JSON');
        const errors = validateInput(entity, body.value);
        if (errors.length) return fail(res, 400, 'VALIDATION_ERROR', 'Дані не пройшли перевірку', errors);
        items[idx] = { ...dataOf(body.value), id: items[idx].id, createdAt: items[idx].createdAt, updatedAt: now() };
        return send(res, 200, items[idx]);
      }
      if (req.method === 'DELETE') {
        items.splice(idx, 1);
        return send(res, 204);
      }
      return fail(res, 405, 'METHOD_NOT_ALLOWED', `Метод ${req.method} не підтримується`);
    }
    return fail(res, 404, 'NOT_FOUND', `Маршрут ${decodeURIComponent(path)} не знайдено; API каталогу – /api/items`);
  };

  return createServer((req, res) => {
    const started = Date.now();
    res.on('finish', () => {
      let shown = req.url;
      try { shown = decodeURIComponent(req.url); } catch { /* залишаємо як є */ }
      console.log(`${req.method} ${shown} → ${res.statusCode} (${Date.now() - started} мс)`);
    });
    setTimeout(() => handle(req, res).catch((e) => fail(res, 500, 'INTERNAL', e.message)), delay);
  });
}

/** Сервер слухає лише цей комп’ютер: інші пристрої в тій самій Wi-Fi-мережі до нього не під’єднаються. */
export function listenLocal(server, port, onReady) {
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Порт ${port} уже зайнятий іншою програмою (можливо, сервер уже запущено в іншому терміналі).`);
      console.error(`Зупиніть її або оберіть інший порт: --port ${port + 1}`);
    } else {
      console.error(`Не вдалося запустити сервер: ${error.message}`);
    }
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', onReady);
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const { values } = parseCli({
      options: {
        entity: { type: 'string', default: 'app/entity.json' },
        data: { type: 'string', default: 'app/data/items.json' },
        port: { type: 'string', default: '3000' },
        delay: { type: 'string', default: '300' },
        'fail-rate': { type: 'string', default: '0' },
      },
    }, 'npm run mock -- --delay 1000 --fail-rate 0.3');
    const entity = JSON.parse(readFileSync(values.entity, 'utf8'));
    const seed = JSON.parse(readFileSync(values.data, 'utf8'));
    const port = Number(values.port);
    const server = createMockServer({ entity, seed, delay: Number(values.delay), failRate: Number(values['fail-rate']) });
    listenLocal(server, port, () => {
      console.log(`Mock API «${entity.title || entity.name}»: http://localhost:${port}/api/items (записів: ${seed.length})`);
      console.log(`Затримка відповіді: ${values.delay} мс; імітація збоїв: ${values['fail-rate']}. Зупинити – Ctrl+C`);
    });
  } catch (error) {
    console.error(`Помилка запуску mock-сервера: ${error.message}`);
    console.error('Приклад: npm run mock -- --delay 1000 --fail-rate 0.3');
    process.exit(1);
  }
}
