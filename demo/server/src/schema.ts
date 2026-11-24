// Перевірка даних запитів бібліотекою zod (практичне завдання № 4). Схема одночасно перевіряє дані
// під час виконання і описує тип TypeScript (z.infer), тому тип і правила не можуть розійтися.
// Перевірки ISBN і дати – ті самі функції модуля предметної області, що й на клієнті (ПЗ 1).
import { z } from 'zod';

z.config(z.locales.uk());   // стандартні повідомлення zod українською (для перевірок без власного тексту)
import { GENRES } from '../../src/domain/book.js';
import { isIsoDate, isValidIsbn13 } from '../../src/domain/validate.js';

const genres = Object.keys(GENRES) as [string, ...string[]];
const today = () => new Date().toISOString().slice(0, 10);

export const BookInput = z.object({
  title: z.string().trim().min(1, 'Вкажіть назву книги').max(200, 'Назва не довша за 200 символів'),
  author: z.string().trim().min(1, 'Вкажіть автора').max(100, 'Ім’я автора не довше за 100 символів'),
  year: z.number().int('Рік – ціле число').min(1450, 'Рік – не раніше 1450')
    .refine((y) => y <= new Date().getFullYear(), 'Рік не може бути в майбутньому'),
  isbn: z.string().refine(isValidIsbn13, 'Неправильний ISBN-13 (13 цифр, контрольна цифра)'),
  genre: z.enum(genres, 'Оберіть жанр зі списку'),
  price: z.number('Вартість – число').min(0, 'Вартість – невід’ємне число'),
  available: z.boolean('Вкажіть, чи доступна книга'),
  receivedAt: z.string().refine(isIsoDate, 'Дата у форматі РРРР-ММ-ДД')
    .refine((d) => !isIsoDate(d) || d <= today(), 'Дата надходження не може бути в майбутньому'),   // zod 4 виконує всі перевірки поля
});
export type BookInput = z.infer<typeof BookInput>;

export interface Book extends BookInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// Параметри списку: невідомий параметр або значення неправильного типу – помилка 400 (контракт API).
const SORTABLE = ['id', 'title', 'author', 'year', 'price', 'receivedAt', 'createdAt'] as const;
const positiveInt = z.coerce.number().int().min(1);

export const ListQuery = z.object({
  q: z.string().optional(),
  page: positiveInt.default(1),
  limit: positiveInt.max(100).default(10),
  sort: z.enum(SORTABLE).default('id'),
  order: z.enum(['asc', 'desc']).default('asc'),
  id: positiveInt.optional(),
  genre: z.enum(genres).optional(),
  author: z.string().optional(),
  year: z.coerce.number().int().optional(),
  available: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
}).strict();
export type ListQuery = z.infer<typeof ListQuery>;

/** Помилки zod → формат контракту [{ field, message }]. */
export const fieldErrors = (error: z.ZodError) =>
  error.issues.map((i) => ({ field: i.path.join('.') || String((i as { keys?: string[] }).keys?.[0] ?? ''), message: i.message }));
