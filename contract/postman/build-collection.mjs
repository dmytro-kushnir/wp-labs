#!/usr/bin/env node
// Генерує колекцію Postman контрактних тестів API каталогу (contract/postman/catalog.postman_collection.json).
// Колекція не залежить від предметної області: дані запитів беруться з fixtures.json студента
// (Newman передає його як дані ітерації), тому однакові тести перевіряють будь-який варіант і будь-яку мову сервера.
//
// node contract/postman/build-collection.mjs
import { writeFileSync } from 'node:fs';

const js = (lines) => lines.join('\n').split('\n');
const json = { mode: 'raw', raw: '{{body}}', options: { raw: { language: 'json' } } };
const header = [{ key: 'Content-Type', value: 'application/json' }];

/** Запит колекції: name, method, path, тіло з fixtures (bodyFrom), скрипт перед запитом і тести. */
function request({ name, method = 'GET', path, bodyFrom, raw, pre = [], test }) {
  const prerequest = bodyFrom ? [`pm.variables.set('body', JSON.stringify(${bodyFrom}));`, ...pre] : pre;
  return {
    name,
    event: [
      ...(prerequest.length ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: js(prerequest) } }] : []),
      { listen: 'test', script: { type: 'text/javascript', exec: js(test) } },
    ],
    request: {
      method,
      header: [...(bodyFrom || raw ? header : []), ...(method === 'GET' ? [] : [{ key: 'Authorization', value: '{{authHeader}}' }])],
      ...(bodyFrom ? { body: json } : raw ? { body: { mode: 'raw', raw } } : {}),
      url: `{{baseUrl}}${path}`,
    },
  };
}

const data = "pm.iterationData.toObject()";
const errorShape = [
  "pm.test('тіло помилки за контрактом', () => {",
  "  const { error } = pm.response.json();",
  "  pm.expect(error.code).to.be.a('string');",
  "  pm.expect(error.message).to.be.a('string');",
  "});",
];

const items = [
  request({ name: '01 GET /api/health', path: '/api/health',
    pre: [
      "// ПЗ 5 (--auth): вхід адміністратора; токен передається в заголовку Authorization усіх запитів зміни",
      "pm.collectionVariables.set('authHeader', '');",
      "if (pm.environment.get('auth') === '1') {",
      "  pm.sendRequest({ url: pm.environment.get('baseUrl') + '/api/auth/login', method: 'POST', header: { 'Content-Type': 'application/json' },",
      "    body: { mode: 'raw', raw: JSON.stringify({ email: pm.environment.get('adminEmail'), password: pm.environment.get('adminPassword') }) } },",
      "    (err, res) => { if (!err && res.code === 200) pm.collectionVariables.set('authHeader', 'Bearer ' + res.json().token); });",
      "}",
    ],
    test: [
    "if (pm.environment.get('auth') === '1') pm.test('вхід адміністратора виконано', () => pm.expect(pm.collectionVariables.get('authHeader')).to.match(/^Bearer /));",
    "pm.test('200 і status: ok', () => { pm.response.to.have.status(200); pm.expect(pm.response.json().status).to.eql('ok'); });",
  ] }),
  request({ name: '02 GET /api/items – сторінка списку', path: '/api/items?limit=5', test: [
    "pm.test('200 і структура ItemPage', () => {",
    "  pm.response.to.have.status(200);",
    "  const page = pm.response.json();",
    "  pm.expect(page.items).to.be.an('array');",
    "  pm.expect(page.items.length).to.be.at.most(5);",
    "  for (const key of ['total', 'page', 'limit']) pm.expect(page[key], key).to.be.a('number');",
    "  for (const item of page.items) pm.expect(item).to.include.keys('id', 'title', 'createdAt', 'updatedAt');",
    "});",
  ] }),
  request({ name: '03 POST /api/items – коректний запис', method: 'POST', path: '/api/items', bodyFrom: `${data}.valid`, test: [
    "pm.test('201, Location і id', () => {",
    "  pm.response.to.have.status(201);",
    "  const item = pm.response.json();",
    "  pm.expect(item.id).to.be.a('number');",
    "  pm.expect(item.title).to.eql(pm.iterationData.get('valid').title.trim());",
    "  pm.expect(pm.response.headers.get('Location')).to.eql(`/api/items/${item.id}`);",
    "  pm.collectionVariables.set('itemId', item.id);",
    "});",
  ] }),
  request({ name: '04 GET /api/items/:id – створений запис', path: '/api/items/{{itemId}}', test: [
    "pm.test('200 і ті самі дані', () => {",
    "  pm.response.to.have.status(200);",
    "  const item = pm.response.json();",
    "  pm.expect(item.id).to.eql(Number(pm.collectionVariables.get('itemId')));",
    "  for (const [k, v] of Object.entries(pm.iterationData.get('valid'))) if (typeof v !== 'string') pm.expect(item[k], k).to.eql(v);",
    "});",
  ] }),
  request({ name: '05 GET /api/items – фільтр за полем', path: '/api/items?{{filterField}}={{filterValue}}&limit=100',
    pre: [
      `const { field, value } = ${data}.filter;`,
      "pm.variables.set('filterField', field);",
      "pm.variables.set('filterValue', String(value));",
    ],
    test: [
      "pm.test('200 і всі записи відповідають фільтру', () => {",
      "  pm.response.to.have.status(200);",
      "  const { field, value } = pm.iterationData.get('filter');",
      "  const page = pm.response.json();",
      "  pm.expect(page.total).to.be.above(0);",
      "  for (const item of page.items) pm.expect(item[field], field).to.eql(value);",
      "});",
    ] }),
  request({ name: '06 POST /api/items – невалідні дані', method: 'POST', path: '/api/items', bodyFrom: `${data}.invalid.body`, test: [
    "pm.test('400 VALIDATION_ERROR з помилками по полях', () => {",
    "  pm.response.to.have.status(400);",
    "  const { error } = pm.response.json();",
    "  pm.expect(error.code).to.eql('VALIDATION_ERROR');",
    "  const fields = error.details.map((d) => d.field);",
    "  for (const f of pm.iterationData.get('invalid').fields) pm.expect(fields, `details містить ${f}`).to.include(f);",
    "  for (const d of error.details) pm.expect(d.message).to.be.a('string').and.not.empty;",
    "});",
    ...errorShape,
  ] }),
  request({ name: '07 PUT /api/items/:id – заміна запису', method: 'PUT', path: '/api/items/{{itemId}}', bodyFrom: `${data}.update`, test: [
    "pm.test('200 і нові значення', () => {",
    "  pm.response.to.have.status(200);",
    "  const item = pm.response.json();",
    "  for (const [k, v] of Object.entries(pm.iterationData.get('update'))) if (typeof v !== 'string') pm.expect(item[k], k).to.eql(v);",
    "  pm.expect(new Date(item.updatedAt) >= new Date(item.createdAt)).to.be.true;",
    "});",
  ] }),
  request({ name: '08 GET /api/items/:id – неіснуючий запис', path: '/api/items/999999', test: [
    "pm.test('404 NOT_FOUND', () => { pm.response.to.have.status(404); pm.expect(pm.response.json().error.code).to.eql('NOT_FOUND'); });",
    ...errorShape,
  ] }),
  request({ name: '09 GET /api/items – неправильні параметри', path: '/api/items?limit=0', test: [
    "pm.test('400 для limit=0', () => pm.response.to.have.status(400));",
    ...errorShape,
  ] }),
  request({ name: '10 POST /api/items – тіло не є JSON', method: 'POST', path: '/api/items', raw: '{oops', test: [
    "pm.test('400', () => pm.response.to.have.status(400));",
    ...errorShape,
  ] }),
  request({ name: '11 Індивідуальне правило – підготовчі записи', method: 'POST', path: '/api/items', bodyFrom: `${data}.rule.setup[0]`, test: [
    "pm.test('підготовчий запис створено (201)', () => pm.response.to.have.status(201));",
    "// решту підготовчих записів (правило № 8 потребує трьох) надсилаємо з тестового скрипту",
    "for (const body of pm.iterationData.get('rule').setup.slice(1)) {",
    "  pm.sendRequest({ url: pm.environment.get('baseUrl') + '/api/items', method: 'POST',",
    "    header: { 'Content-Type': 'application/json' }, body: { mode: 'raw', raw: JSON.stringify(body) } },",
    "    (err, res) => pm.test(`підготовчий запис «${body.title}» (201)`, () => pm.expect(res.code).to.eql(201)));",
    "}",
  ] }),
  request({ name: '12 Індивідуальне правило – перевірка', method: 'POST', path: '/api/items', bodyFrom: `${data}.rule.violation`, test: [
    "const rule = pm.iterationData.get('rule');",
    "if (pm.environment.get('skipRule') === '1') {",
    "  pm.test('правило не перевіряється (mock-сервер)', () => true);",
    "} else {",
    "  pm.test(`${rule.description}: статус ${rule.status}`, () => pm.response.to.have.status(rule.status));",
    "  if (rule.expect) pm.test('значення після нормалізації', () => {",
    "    for (const [k, v] of Object.entries(rule.expect)) pm.expect(pm.response.json()[k], k).to.eql(v);",
    "  });",
    "}",
  ] }),
  request({ name: '13 Безпека: зміна без токена', method: 'POST', path: '/api/items', bodyFrom: `${data}.valid`,
    pre: ["pm.request.headers.remove('Authorization');"],
    test: [
      "if (pm.environment.get('auth') !== '1') { pm.test('автентифікація не перевіряється (ПЗ 4)', () => true); } else {",
      "  pm.test('401 і WWW-Authenticate: Bearer', () => { pm.response.to.have.status(401); pm.expect(pm.response.headers.get('WWW-Authenticate')).to.eql('Bearer'); });",
      "}",
    ] }),
  request({ name: '14 Безпека: хибний пароль', method: 'POST', path: '/api/auth/login', raw: '{{badLogin}}',
    pre: ["pm.variables.set('badLogin', JSON.stringify({ email: pm.environment.get('adminEmail') || 'admin@example.com', password: 'wrong-password-123' }));"],
    test: [
      "if (pm.environment.get('auth') !== '1') { pm.test('автентифікація не перевіряється (ПЗ 4)', () => true); } else {",
      "  pm.test('401 без підказки, що саме неправильне', () => pm.response.to.have.status(401));",
      "}",
    ] }),
  request({ name: '15 Безпека: користувач не може видалити запис', method: 'DELETE', path: '/api/items/{{itemId}}',
    pre: [
      "// реєстрація і вхід звичайного користувача; запит виконується з його токеном",
      "if (pm.environment.get('auth') === '1') {",
      "  const credentials = { email: `user${Date.now()}@example.com`, password: 'user-password-123' };",
      "  const post = (path, body, cb) => pm.sendRequest({ url: pm.environment.get('baseUrl') + path, method: 'POST',",
      "    header: { 'Content-Type': 'application/json' }, body: { mode: 'raw', raw: JSON.stringify(body) } }, cb);",
      "  post('/api/auth/register', credentials, () => post('/api/auth/login', credentials, (err, res) => {",
      "    pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + (res && res.code === 200 ? res.json().token : '') });",
      "  }));",
      "} else {",
      "  pm.request.url = pm.environment.get('baseUrl') + '/api/health';",
      "  pm.request.method = 'GET';",
      "}",
    ],
    test: [
      "if (pm.environment.get('auth') !== '1') { pm.test('автентифікація не перевіряється (ПЗ 4)', () => true); } else {",
      "  pm.test('403 FORBIDDEN', () => { pm.response.to.have.status(403); pm.expect(pm.response.json().error.code).to.eql('FORBIDDEN'); });",
      "}",
    ] }),
  request({ name: '16 DELETE /api/items/:id', method: 'DELETE', path: '/api/items/{{itemId}}', test: [
    "pm.test('204 без тіла', () => { pm.response.to.have.status(204); pm.expect(pm.response.text()).to.eql(''); });",
  ] }),
  request({ name: '17 GET /api/items/:id – видалений запис', path: '/api/items/{{itemId}}', test: [
    "pm.test('404 після видалення', () => pm.response.to.have.status(404));",
  ] }),
];

const collection = {
  info: {
    name: 'WP Catalog API – контрактні тести',
    description: 'Перевірка відповідності сервера контракту contract/openapi.yaml. Дані запитів – fixtures.json варіанту студента.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'baseUrl', value: 'http://localhost:3000' }, { key: 'itemId', value: '' }, { key: 'authHeader', value: '' }],
  item: items,
};

writeFileSync(new URL('./catalog.postman_collection.json', import.meta.url), JSON.stringify(collection, null, 2) + '\n');
console.log(`catalog.postman_collection.json: ${items.length} запитів`);
