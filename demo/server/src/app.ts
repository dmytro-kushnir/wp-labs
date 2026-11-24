// Збирання застосунку Express (практичне завдання № 4). Функція createApp не запускає сервер –
// тому той самий застосунок використовують і server.ts, і автоматизовані тести з базою в пам’яті.
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { DatabaseSync } from 'node:sqlite';
import { createRepository } from './repository.ts';
import { itemsRouter } from './routes.ts';
import { HttpError, errorHandler } from './errors.ts';
import { authenticate, createLoginLimiter, createTokens, requireRole } from './auth.ts';
import { authRouter, keysRouter } from './auth-routes.ts';
import { createUsers } from './users.ts';

const contract = parse(readFileSync(new URL('../../../contract/openapi.yaml', import.meta.url), 'utf8'));

export interface AppOptions { db: DatabaseSync; corsOrigin: string; jwtSecret: string }

export function createApp({ db, corsOrigin, jwtSecret }: AppOptions) {
  const app = express();
  const repo = createRepository(db);
  const users = createUsers(db);
  const tokens = createTokens(jwtSecret);
  const limiter = createLoginLimiter();

  app.disable('x-powered-by');                         // не повідомляємо, на чому працює сервер
  // Заголовки безпеки (ПЗ 5): заборона вгадування типу вмісту, вбудовування в чужі сторінки і передавання адреси.
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  // CORS: дозволяємо запити лише зі сторінки застосунку (детальніше – розділ 5).
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Expose-Headers': 'Location',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    next();
  });

  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.use('/api', authenticate(tokens, users.findApiKey));          // res.locals.user за токеном або ключем
  app.use('/api/auth', authRouter(users, tokens, limiter));
  app.use('/api/keys', keysRouter(users));
  app.use('/api/items', itemsRouter(repo, {
    create: requireRole('user', 'admin', 'device'),   // пристрій лише додає записи (показники)
    update: requireRole('user', 'admin'),
    remove: requireRole('admin'),
  }));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(contract));   // інтерактивна документація API

  app.use((req, _res, next) => next(new HttpError(404, 'NOT_FOUND', `Маршрут ${req.path} не знайдено; API каталогу – /api/items`)));
  app.use(errorHandler);
  return app;
}
