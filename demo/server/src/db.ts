// База даних SQLite (практичне завдання № 4): відкриття файлу, міграції схеми і початкові дані.
// Модуль node:sqlite вбудований у Node.js – встановлювати драйвер бази даних не потрібно.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Міграції – послідовні зміни схеми. Номер застосованої міграції зберігається в PRAGMA user_version,
 * тому під час запуску виконуються лише нові міграції, а наявні дані не втрачаються.
 */
const MIGRATIONS: string[] = [
  `CREATE TABLE books (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     title       TEXT    NOT NULL,
     title_key   TEXT    NOT NULL UNIQUE,      -- назва малими літерами без пробілів по краях (правило № 1)
     author      TEXT    NOT NULL,
     year        INTEGER NOT NULL,
     isbn        TEXT    NOT NULL,
     genre       TEXT    NOT NULL,
     price       REAL    NOT NULL CHECK (price >= 0),
     available   INTEGER NOT NULL CHECK (available IN (0, 1)),
     received_at TEXT    NOT NULL,              -- дата РРРР-ММ-ДД
     search_text TEXT    NOT NULL,              -- назва й автор малими літерами для пошуку ?q=
     created_at  TEXT    NOT NULL,
     updated_at  TEXT    NOT NULL
   )`,
  'CREATE INDEX books_genre ON books (genre)',
  // ПЗ 5: користувачі. Пароль не зберігається – лише хеш scrypt разом із сіллю (рядок password_hash).
  `CREATE TABLE users (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     email         TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     role          TEXT NOT NULL CHECK (role IN ('user', 'admin')),
     created_at    TEXT NOT NULL
   )`,
  // ПЗ 5: ключі пристроїв (плати, симулятор). Зберігається SHA-256 ключа; сам ключ показується один раз під час створення.
  `CREATE TABLE api_keys (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     name       TEXT NOT NULL,
     key_hash   TEXT NOT NULL UNIQUE,
     created_at TEXT NOT NULL
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
