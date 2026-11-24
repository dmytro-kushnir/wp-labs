// ПЗ 4. База даних SQLite: відкриття файлу і міграції схеми (запуск міграцій готовий – допишіть таблицю).
// Зразок – demo/server/src/db.ts.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** Міграції – послідовні зміни схеми; номер застосованої зберігається в PRAGMA user_version. Нові – лише в кінець списку. */
const MIGRATIONS: string[] = [
  `CREATE TABLE items (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     title       TEXT    NOT NULL,
     search_text TEXT    NOT NULL,     -- назва і текстове поле малими літерами для пошуку ?q=
     created_at  TEXT    NOT NULL,
     updated_at  TEXT    NOT NULL
     -- TODO: стовпці полів варіанту з app/entity.json (типи, NOT NULL, CHECK для меж і булевого поля)
   )`,
];

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    db.exec(MIGRATIONS[i]);
    db.exec(`PRAGMA user_version = ${i + 1}`);
    db.exec('COMMIT');
  }
  return db;
}
