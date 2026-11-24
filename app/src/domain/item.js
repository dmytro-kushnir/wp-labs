// ПЗ 1. Сутність предметної області вашого варіанту.
// Перейменуйте клас і файл відповідно до варіанту (наприклад, Session для «Кінотеатру»).
// Зразок – demo/src/domain/book.js у репозиторії курсу.

/** Довідник значень поля-переліку: ключ зберігається в даних, значення показується користувачу. */
export const CATEGORIES = Object.freeze({
  // TODO: значення переліку вашого варіанту
});

export class Item {
  /** @param {object} data */
  constructor({ id = null, title, createdAt = null, updatedAt = null /* TODO: поля варіанту */ }) {
    this.id = id;
    this.title = title;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    // TODO: решта полів
  }

  // TODO: щонайменше один гетер (наприклад, назва категорії українською)
  // TODO: щонайменше два методи з логікою предметної області
  // TODO: toString()
  // TODO: static from(data)
}

// TODO: підклас, що перевизначає щонайменше один метод батьківського класу
