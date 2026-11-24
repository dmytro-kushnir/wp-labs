// ПЗ 4. Маршрути ресурсу /api/items за контрактом contract/openapi.yaml. Зразок – demo/server/src/routes.ts.
import { Router } from 'express';
import { ListQuery, fieldErrors } from './schema.ts';
import { HttpError } from './errors.ts';
import type { Repository } from './repository.ts';

export function itemsRouter(repo: Repository): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) throw new HttpError(400, 'BAD_QUERY', 'Неправильні параметри запиту', fieldErrors(query.error));
    res.json(repo.list(query.data));
  });

  // TODO: POST /         – перевірка тіла схемою ItemInput (400), індивідуальне правило (400/409), 201 + Location
  // TODO: GET /:id       – 200 або 404
  // TODO: PUT /:id       – 400, 404, 409 або 200
  // TODO: DELETE /:id    – 204 або 404

  return router;
}
