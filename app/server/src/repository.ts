// ПЗ 4. Репозиторій: уся робота з SQL. Значення – лише параметрами (?), без склеювання рядків.
// Зразок – demo/server/src/repository.ts.
import type { DatabaseSync } from 'node:sqlite';
import type { Item, ItemInput, ListQuery } from './schema.ts';

export function createRepository(db: DatabaseSync) {
  return {
    /** TODO: SELECT з WHERE за фільтрами і ?q=; сортування й сторінки – функціями з src/domain (ПЗ 1). */
    list(query: ListQuery): { items: Item[]; total: number; page: number; limit: number } {
      void db;
      return { items: [], total: 0, page: query.page, limit: query.limit };
    },
    /** TODO: SELECT … WHERE id = ? */
    get(id: number): Item | undefined { void id; return undefined; },
    /** TODO: INSERT і повернення створеного запису з id, createdAt, updatedAt */
    create(data: ItemInput): Item { void data; throw new Error('create() ще не реалізовано'); },
    /** TODO: UPDATE … WHERE id = ?; undefined – запису немає */
    update(id: number, data: ItemInput): Item | undefined { void id; void data; return undefined; },
    /** TODO: DELETE … WHERE id = ?; true – запис видалено */
    remove(id: number): boolean { void id; return false; },
    /** Кількість записів (для початкового заповнення бази). */
    count(): number { return 0; },
  };
}

export type Repository = ReturnType<typeof createRepository>;
