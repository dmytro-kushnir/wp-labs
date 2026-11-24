#!/usr/bin/env node
// Імітатор і міст пристрою IoT (практичне завдання № 5, IoT-варіант проєктного треку).
// Надсилає записи на API запитами POST /api/items з ключем пристрою (заголовок X-API-Key).
//
//   node tools/device.mjs --simulate 5 --key wp_...      – 5 випадкових показників за шаблоном app/fixtures.json
//   node tools/device.mjs --replay wokwi-log.txt --key …  – записи з логу Serial Monitor (Wokwi або плата):
//                                                          кожен рядок з об’єктом JSON – один запит POST
// Параметри: --url (типово http://localhost:3000), --interval мс між запитами (типово 1000), --fixtures, --entity.
// Ключ можна передати змінною середовища DEVICE_KEY.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCli } from './args.mjs';

/** Рядки логу Serial Monitor → об’єкти JSON (рядки без JSON – службові повідомлення прошивки – пропускаються). */
export function parseLog(text) {
  return text.split(/\r?\n/).flatMap((line) => {
    const start = line.indexOf('{');
    const end = line.lastIndexOf('}');
    if (start === -1 || end < start) return [];
    try { return [JSON.parse(line.slice(start, end + 1))]; } catch { return []; }
  });
}

/** Випадковий показник: шаблон – коректний запис з fixtures.json, числове поле – випадкове в межах опису сутності. */
function simulated(i, template, entity) {
  const item = { ...template, title: `Показник ${new Date().toISOString().slice(11, 19)} № ${i}` };
  for (const [key, field] of Object.entries(entity.fields)) {
    if ((field.type === 'number' || field.type === 'integer') && key in item) {
      const min = field.min ?? 0;
      const max = typeof field.max === 'number' ? field.max : min + 100;
      const value = min + Math.random() * (max - min);
      item[key] = field.type === 'integer' ? Math.round(value) : Math.round(value * 10) / 10;
      break;   // змінюємо одне числове поле – «вимірювану величину»
    }
  }
  return item;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const { values } = parseCli({
    options: {
      url: { type: 'string', default: 'http://localhost:3000' },
      key: { type: 'string', default: process.env.DEVICE_KEY ?? '' },
      simulate: { type: 'string' },
      replay: { type: 'string' },
      interval: { type: 'string', default: '1000' },
      fixtures: { type: 'string', default: 'app/fixtures.json' },
      entity: { type: 'string', default: 'app/entity.json' },
    },
  }, 'node tools/device.mjs --simulate 5 --key wp_…');

  if (!values.simulate && !values.replay) {
    console.error('Вкажіть режим: --simulate <кількість> або --replay <файл логу>');
    process.exit(1);
  }
  if (!values.key) console.warn('Увага: ключ пристрою не задано (--key або DEVICE_KEY) – сервер ПЗ 5 відповість 401');

  const records = values.replay
    ? parseLog(readFileSync(values.replay, 'utf8'))
    : Array.from({ length: Number(values.simulate) }, (_, i) => simulated(i + 1,
      JSON.parse(readFileSync(values.fixtures, 'utf8')).valid, JSON.parse(readFileSync(values.entity, 'utf8'))));

  let ok = 0;
  for (const [i, record] of records.entries()) {
    try {
      const res = await fetch(new URL('/api/items', values.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': values.key },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) { ok++; console.log(`${i + 1}/${records.length} → ${res.status} id=${body?.id} «${record.title}»`); }
      else console.log(`${i + 1}/${records.length} → ${res.status} ${body?.error?.message ?? ''} ${JSON.stringify(body?.error?.details ?? [])}`);
    } catch (error) {
      console.log(`${i + 1}/${records.length} → немає з’єднання з ${values.url} (${error.name})`);
    }
    if (i < records.length - 1) await new Promise((r) => setTimeout(r, Number(values.interval)));
  }
  console.log(`Надіслано: ${records.length}, прийнято сервером: ${ok}`);
  process.exit(ok === records.length ? 0 : 1);
}
