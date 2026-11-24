// Автентифікація та авторизація (практичне завдання № 5): хешування паролів, токени JWT, ключі пристроїв,
// перевірка ролей і обмеження частоти невдалих спроб входу.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { RequestHandler } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { HttpError } from './errors.ts';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export type Role = 'user' | 'admin' | 'device';
export interface AuthUser { id: number; email: string; role: Role }

// ---------------------------------------------------------------- паролі
/**
 * Хеш пароля scrypt з випадковою сіллю 16 байтів: однакові паролі різних користувачів мають різні хеші,
 * тому заздалегідь обчислені таблиці (rainbow tables) непридатні, а scrypt навмисно повільний і вимагає пам’яті.
 * Формат рядка: scrypt$<сіль hex>$<хеш hex>.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** Порівняння сталого часу (timingSafeEqual): час перевірки не підказує, скільки байтів збіглося. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------- ключі пристроїв
/** Новий ключ пристрою (показується один раз) і його SHA-256 для зберігання в базі. */
export function newApiKey(): { key: string; hash: string } {
  const key = `wp_${randomBytes(24).toString('base64url')}`;
  return { key, hash: hashApiKey(key) };
}
// Ключ – випадкові 192 біти, а не пароль людини, тому швидкого SHA-256 достатньо.
export const hashApiKey = (key: string) => createHash('sha256').update(key).digest('hex');

// ---------------------------------------------------------------- токени JWT
export function createTokens(secret: string, ttl = '1h') {
  const key = new TextEncoder().encode(secret);
  return {
    /** Підписаний токен HS256 з ідентифікатором (sub), роллю і строком дії. */
    issue: (user: AuthUser) => new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuedAt()
      .setExpirationTime(ttl)
      .sign(key),
    /** Перевірка підпису і строку дії; дозволено лише алгоритм HS256 (захист від підміни алгоритму). */
    verify: async (token: string): Promise<AuthUser> => {
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
      return { id: Number(payload.sub), email: String(payload.email), role: payload.role as Role };
    },
  };
}
export type Tokens = ReturnType<typeof createTokens>;

// ---------------------------------------------------------------- проміжні обробники
/**
 * Визначає користувача запиту за заголовком Authorization: Bearer <JWT> або X-API-Key: <ключ пристрою>
 * і зберігає його в res.locals.user. Запит без облікових даних проходить далі анонімно.
 */
export function authenticate(tokens: Tokens, findApiKey: (hash: string) => { id: number; name: string } | undefined): RequestHandler {
  return async (req, res, next) => {
    try {
      const header = req.get('authorization') ?? '';
      const apiKey = req.get('x-api-key');
      if (header.startsWith('Bearer ')) {
        res.locals.user = await tokens.verify(header.slice(7).trim());
      } else if (apiKey) {
        const device = findApiKey(hashApiKey(apiKey));
        if (!device) throw new Error('unknown key');
        res.locals.user = { id: device.id, email: device.name, role: 'device' } satisfies AuthUser;
      }
      next();
    } catch {
      next(new HttpError(401, 'UNAUTHORIZED', 'Недійсний або прострочений токен чи ключ'));
    }
  };
}

/** Дозвіл лише для перелічених ролей: немає облікових даних – 401, недостатньо прав – 403. */
export const requireRole = (...roles: Role[]): RequestHandler => (_req, res, next) => {
  const user = res.locals.user as AuthUser | undefined;
  if (!user) return next(new HttpError(401, 'UNAUTHORIZED', 'Потрібна автентифікація'));
  if (!roles.includes(user.role)) return next(new HttpError(403, 'FORBIDDEN', 'Недостатньо прав для цієї дії'));
  next();
};

/**
 * Обмеження частоти невдалих входів (рівень «Високий»): не більше max невдалих спроб за вікно часу
 * для пари «IP-адреса + email» – захист від підбору пароля. Стан у пам’яті процесу.
 */
export function createLoginLimiter({ max = 5, windowMs = 15 * 60_000 } = {}) {
  const failures = new Map<string, number[]>();
  const recent = (key: string, now: number) => (failures.get(key) ?? []).filter((t) => now - t < windowMs);
  return {
    check(key: string, now = Date.now()) {
      const list = recent(key, now);
      if (list.length >= max) {
        const retryAfter = Math.ceil((windowMs - (now - list[0])) / 1000);
        throw new HttpError(429, 'TOO_MANY_REQUESTS', `Забагато невдалих спроб входу. Спробуйте через ${Math.ceil(retryAfter / 60)} хв`, [], { 'Retry-After': String(retryAfter) });
      }
    },
    fail: (key: string, now = Date.now()) => { failures.set(key, [...recent(key, now), now]); },
    reset: (key: string) => { failures.delete(key); },
  };
}
