// Маршрути автентифікації (практичне завдання № 5): реєстрація, вхід, поточний користувач, ключі пристроїв.
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from './errors.ts';
import { fieldErrors } from './schema.ts';
import { hashPassword, newApiKey, requireRole, verifyPassword } from './auth.ts';
import type { AuthUser, Tokens, createLoginLimiter } from './auth.ts';
import type { Users } from './users.ts';

const Credentials = z.object({
  email: z.email('Неправильна адреса електронної пошти').max(200),
  password: z.string().min(8, 'Пароль – щонайменше 8 символів').max(200),
});
const KeyInput = z.object({ name: z.string().trim().min(1, 'Вкажіть назву пристрою').max(100) });

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Дані не пройшли перевірку', fieldErrors(result.error));
  return result.data;
}

// Однакове повідомлення для «немає такого email» і «неправильний пароль»: не підказуємо, які адреси зареєстровано.
const badLogin = () => new HttpError(401, 'UNAUTHORIZED', 'Неправильний email або пароль');

export function authRouter(users: Users, tokens: Tokens, limiter: ReturnType<typeof createLoginLimiter>): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { email, password } = parse(Credentials, req.body);
    if (users.findForLogin(email)) {
      throw new HttpError(409, 'CONFLICT', 'Користувач з такою адресою вже існує', [{ field: 'email', message: 'Адреса вже зареєстрована' }]);
    }
    const user = users.create(email, await hashPassword(password));
    res.status(201).json(user);                          // { id, email, role } – без хешу пароля
  });

  router.post('/login', async (req, res) => {
    const { email, password } = parse(Credentials, req.body);
    const key = `${req.ip}|${email.toLowerCase()}`;
    limiter.check(key);
    const row = users.findForLogin(email);
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      limiter.fail(key);
      throw badLogin();
    }
    limiter.reset(key);
    const user: AuthUser = { id: row.id, email: row.email, role: row.role };
    res.json({ token: await tokens.issue(user), tokenType: 'Bearer', expiresIn: 3600, user });
  });

  router.get('/me', requireRole('user', 'admin'), (_req, res) => {
    const user = users.get((res.locals.user as AuthUser).id);
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Користувача не знайдено');
    res.json(user);
  });

  return router;
}

/** Ключі пристроїв (плата ESP32, симулятор Wokwi через tools/device.mjs) створює лише адміністратор. */
export function keysRouter(users: Users): Router {
  const router = Router();
  router.post('/', requireRole('admin'), (req, res) => {
    const { name } = parse(KeyInput, req.body);
    const { key, hash } = newApiKey();
    const created = users.createApiKey(name, hash);
    res.status(201).json({ ...created, key, note: 'Збережіть ключ: повторно його показати неможливо' });
  });
  return router;
}
