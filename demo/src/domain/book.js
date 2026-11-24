// Сутність предметної області «Бібліотека» (практичне завдання № 1).

/** Жанри книг: ключ зберігається в даних, значення показується користувачу. */
export const GENRES = Object.freeze({
  fiction: 'Художня література',
  fantasy: 'Фентезі',
  science: 'Науково-популярна',
  history: 'Історична',
  children: 'Дитяча',
  poetry: 'Поезія',
});

/** Книга з каталогу бібліотеки. */
export class Book {
  /**
   * @param {object} data - поля книги (зазвичай з API або з форми)
   */
  constructor({ id = null, title, author, year, isbn, genre, price, available = true, receivedAt, createdAt = null, updatedAt = null }) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.year = year;
    this.isbn = isbn;
    this.genre = genre;
    this.price = price;
    this.available = available;
    this.receivedAt = receivedAt;   // рядок РРРР-ММ-ДД
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /** Назва жанру українською. */
  get genreLabel() {
    return GENRES[this.genre] ?? this.genre;
  }

  /** Скільки років минуло від видання. */
  age(currentYear = new Date().getFullYear()) {
    return currentYear - this.year;
  }

  /** Класикою вважаємо книги, видані щонайменше 100 років тому. */
  isClassic(currentYear = new Date().getFullYear()) {
    return this.age(currentYear) >= 100;
  }

  /** Чи можна взяти книгу зараз. */
  isAvailable() {
    return this.available;
  }

  toString() {
    return `«${this.title}», ${this.author} (${this.year})`;
  }

  /** Створює книгу з простого об’єкта; повторний виклик для Book повертає той самий об’єкт. */
  static from(data) {
    return data instanceof Book ? data : new Book(data);
  }
}

/** Електронна книга: завжди доступна, має формат файлу. */
export class EBook extends Book {
  constructor({ format = 'epub', ...rest }) {
    super({ ...rest, available: true });
    this.format = format;
  }

  // Перевизначення методу батьківського класу (поліморфізм).
  isAvailable() {
    return true;
  }

  toString() {
    return `${super.toString()} [${this.format.toUpperCase()}]`;
  }
}
