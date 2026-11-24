// Картка книги (практичне завдання № 6). React вставляє значення {…} як текст – розмітка з даних користувача
// не виконується, тому ручне екранування і textContent (ПЗ 2) тут не потрібні.
import { Link } from 'react-router';
import { Book } from '../../../src/domain/book.js';
import { formatPrice } from '../../../src/domain/format.js';

export interface BookData {
  id: number; title: string; author: string; year: number; isbn: string;
  genre: string; price: number; available: boolean; receivedAt: string;
}

export function BookCard({ data }: { data: BookData }) {
  const book = Book.from(data);
  return (
    <li className="card" data-available={String(book.available)}>
      <h2 className="card-title"><Link to={`/books/${book.id}`}>{book.title}</Link></h2>
      <p className="card-author">{book.author}</p>
      <p className="card-meta">{book.genreLabel} · {book.year}{book.isClassic() ? ' · класика' : ''}</p>
      <p className="card-price">{formatPrice(book.price)}</p>
    </li>
  );
}
