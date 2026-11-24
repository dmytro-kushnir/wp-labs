// @ts-check
// Єдиний тип помилки для обох сховищ (localStorage у ПЗ 2 і HTTP у ПЗ 3):
// інтерфейс обробляє помилки однаково, не знаючи, звідки прийшли дані.

/** @typedef {{ field: string, message: string }} FieldError */

export class StoreError extends Error {
  /**
   * @param {string} message - повідомлення для користувача
   * @param {{ status?: number, code?: string, details?: FieldError[] }} [info]
   */
  constructor(message, { status = 0, code = 'UNKNOWN', details = [] } = {}) {
    super(message);
    this.name = 'StoreError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
