// ПЗ 4. Перевірка даних запитів бібліотекою zod. Зразок – demo/server/src/schema.ts.
import { z } from 'zod';

z.config(z.locales.uk());   // стандартні повідомлення zod українською (для перевірок без власного тексту)

export const ItemInput = z.object({
  title: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Назва не довша за 200 символів'),
  // TODO: поля варіанту з app/entity.json: типи, обов’язковість, межі, формат дати, перелік (z.enum)
  // TODO: індивідуальне правило без звернення до бази – через .refine/.superRefine (правила № 2–7)
});
export type ItemInput = z.infer<typeof ItemInput>;

export interface Item extends ItemInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

const positiveInt = z.coerce.number().int().min(1);

/** Параметри списку: невідомий параметр або значення неправильного типу – помилка 400. */
export const ListQuery = z.object({
  q: z.string().optional(),
  page: positiveInt.default(1),
  limit: positiveInt.max(100).default(10),
  sort: z.enum(['id', 'title', 'createdAt']).default('id'),   // TODO: поля варіанту, за якими можна сортувати
  order: z.enum(['asc', 'desc']).default('asc'),
  id: positiveInt.optional(),
  // TODO: фільтри за полями варіанту (перелік, булеве поле: z.enum(['true', 'false']).transform(...))
}).strict();
export type ListQuery = z.infer<typeof ListQuery>;

/** Помилки zod → формат контракту [{ field, message }]. */
export const fieldErrors = (error: z.ZodError) =>
  error.issues.map((i) => ({ field: i.path.join('.') || String((i as { keys?: string[] }).keys?.[0] ?? ''), message: i.message }));
