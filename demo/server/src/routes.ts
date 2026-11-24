// Маршрути ресурсу /api/items за контрактом contract/openapi.yaml (практичне завдання № 4).
// Маршрут лише перевіряє запит, викликає репозиторій і формує відповідь – логіки SQL тут немає.
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { BookInput, ListQuery, fieldErrors } from './schema.ts';
import { HttpError, notFound } from './errors.ts';
import type { Repository } from './repository.ts';

/** Розбір тіла запиту схемою zod: помилки – 400 з деталями по полях. */
function parseBody(body: unknown): BookInput {
  const result = BookInput.safeParse(body);
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Дані не пройшли перевірку', fieldErrors(result.error));
  return result.data;
}

const parseId = (raw: string | string[]) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw notFound(`Запис ${raw}`);
  return id;
};

/** Індивідуальне правило демо-варіанту (PETRENKO, № 1): назва унікальна → 409 Conflict. */
function assertUniqueTitle(repo: Repository, title: string, ownId?: number) {
  const other = repo.idByTitle(title);
  if (other !== undefined && other !== ownId) {
    throw new HttpError(409, 'CONFLICT', 'Книга з такою назвою вже є в каталозі', [{ field: 'title', message: 'Назва має бути унікальною' }]);
  }
}

/** Перевірки доступу для операцій зміни (ПЗ 5); без них (ПЗ 4) маршрути відкриті. */
export interface Guards { create: RequestHandler; update: RequestHandler; remove: RequestHandler }
const open: RequestHandler = (_req, _res, next) => next();

export function itemsRouter(repo: Repository, guards: Guards = { create: open, update: open, remove: open }): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) throw new HttpError(400, 'BAD_QUERY', 'Неправильні параметри запиту', fieldErrors(query.error));
    res.json(repo.list(query.data));
  });

  router.post('/', guards.create, (req, res) => {
    const data = parseBody(req.body);
    assertUniqueTitle(repo, data.title);
    const book = repo.create(data);
    res.status(201).location(`/api/items/${book.id}`).json(book);
  });

  router.get('/:id', (req, res) => {
    const book = repo.get(parseId(req.params.id));
    if (!book) throw notFound(`Запис ${req.params.id}`);
    res.json(book);
  });

  router.put('/:id', guards.update, (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(req.body);
    if (!repo.get(id)) throw notFound(`Запис ${id}`);
    assertUniqueTitle(repo, data.title, id);
    res.json(repo.update(id, data));
  });

  router.delete('/:id', guards.remove, (req, res) => {
    if (!repo.remove(parseId(req.params.id))) throw notFound(`Запис ${req.params.id}`);
    res.status(204).end();
  });

  return router;
}
