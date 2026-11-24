// Репозиторій книг (практичне завдання № 4): уся робота з SQL зосереджена тут, маршрути не знають про таблиці.
// Значення в запити передаються лише параметрами (?), а не склеюванням рядків – захист від SQL-ін’єкцій (розділ 5).
import type { DatabaseSync } from 'node:sqlite';
import type { Book, BookInput, ListQuery } from './schema.ts';
import { paginate, sortBooks } from '../../src/domain/catalog.js';

interface Row {
  id: number; title: string; author: string; year: number; isbn: string; genre: string; price: number;
  available: number; received_at: string; created_at: string; updated_at: string;
}

const toBook = (r: Row): Book => ({
  id: r.id, title: r.title, author: r.author, year: r.year, isbn: r.isbn, genre: r.genre, price: r.price,
  available: r.available === 1, receivedAt: r.received_at, createdAt: r.created_at, updatedAt: r.updated_at,
});

// Вбудовані функції SQLite lower() і LIKE не змінюють регістр кирилиці, тому ключі пошуку обчислює JavaScript.
export const titleKey = (title: string) => title.trim().toLocaleLowerCase('uk');
const searchText = (b: BookInput) => `${b.title} ${b.author}`.toLocaleLowerCase('uk');

const COLUMNS = 'id, title, author, year, isbn, genre, price, available, received_at, created_at, updated_at';

export function createRepository(db: DatabaseSync) {
  const byId = db.prepare(`SELECT ${COLUMNS} FROM books WHERE id = ?`);
  const byTitleKey = db.prepare('SELECT id FROM books WHERE title_key = ?');
  const insert = db.prepare(`INSERT INTO books (title, title_key, author, year, isbn, genre, price, available, received_at, search_text, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const update = db.prepare(`UPDATE books SET title = ?, title_key = ?, author = ?, year = ?, isbn = ?, genre = ?, price = ?, available = ?,
                             received_at = ?, search_text = ?, updated_at = ? WHERE id = ?`);
  const remove = db.prepare('DELETE FROM books WHERE id = ?');
  const values = (b: BookInput) => [b.title, titleKey(b.title), b.author, b.year, b.isbn, b.genre, b.price, b.available ? 1 : 0, b.receivedAt, searchText(b)];

  return {
    /** Фільтрація – у SQL, сортування за українською абеткою і сторінки – функціями модуля предметної області (ПЗ 1). */
    list(query: ListQuery) {
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (query.q) { where.push('search_text LIKE ?'); params.push(`%${query.q.trim().toLocaleLowerCase('uk')}%`); }
      if (query.id !== undefined) { where.push('id = ?'); params.push(query.id); }
      if (query.genre !== undefined) { where.push('genre = ?'); params.push(query.genre); }
      if (query.author !== undefined) { where.push('author = ?'); params.push(query.author); }
      if (query.year !== undefined) { where.push('year = ?'); params.push(query.year); }
      if (query.available !== undefined) { where.push('available = ?'); params.push(query.available ? 1 : 0); }
      const sql = `SELECT ${COLUMNS} FROM books${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
      const books = (db.prepare(sql).all(...params) as unknown as Row[]).map(toBook);
      const page = paginate(sortBooks(books, query.sort, query.order), query.page, query.limit);
      return { items: page.items as Book[], total: page.total, page: page.page, limit: query.limit };
    },

    get: (id: number): Book | undefined => {
      const row = byId.get(id) as unknown as Row | undefined;
      return row && toBook(row);
    },

    /** id іншої книги з такою самою назвою (без урахування регістру) або undefined. */
    idByTitle: (title: string): number | undefined => (byTitleKey.get(titleKey(title)) as { id: number } | undefined)?.id,

    create(data: BookInput): Book {
      const now = new Date().toISOString();
      const { lastInsertRowid } = insert.run(...values(data), now, now);
      return this.get(Number(lastInsertRowid))!;
    },

    update(id: number, data: BookInput): Book | undefined {
      const { changes } = update.run(...values(data), new Date().toISOString(), id);
      return changes ? this.get(id) : undefined;
    },

    remove: (id: number): boolean => remove.run(id).changes > 0,

    count: (): number => (db.prepare('SELECT COUNT(*) AS n FROM books').get() as { n: number }).n,
  };
}

export type Repository = ReturnType<typeof createRepository>;
