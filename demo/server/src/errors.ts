// Помилки HTTP і їх перетворення на відповідь у форматі контракту { error: { code, message, details } }.
import type { ErrorRequestHandler } from 'express';

export interface FieldError { field: string; message: string }

// Поля оголошено явно: скорочений запис constructor(public status: number) не є «стираним» синтаксисом
// TypeScript – Node.js не може просто відкинути його без компіляції (параметр erasableSyntaxOnly).
export class HttpError extends Error {
  status: number;
  code: string;
  details: FieldError[];
  headers: Record<string, string>;

  constructor(status: number, code: string, message: string, details: FieldError[] = [], headers: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

export const notFound = (what: string) => new HttpError(404, 'NOT_FOUND', `${what} не знайдено`);

/** Останній обробник Express: усі винятки маршрутів перетворюються на відповідь JSON. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    if (error.status === 401) res.set('WWW-Authenticate', 'Bearer');   // RFC 9110: 401 вказує схему автентифікації
    res.set(error.headers).status(error.status).json({ error: { code: error.code, message: error.message, ...(error.details.length ? { details: error.details } : {}) } });
    return;
  }
  if (error?.type === 'entity.parse.failed') {           // помилка express.json()
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Тіло запиту не є коректним JSON' } });
    return;
  }
  console.error(error);                                  // невідома помилка – у журнал сервера, а не користувачу
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Внутрішня помилка сервера' } });
};
