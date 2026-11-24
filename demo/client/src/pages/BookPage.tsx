// Сторінка однієї книги (практичне завдання № 6): параметр маршруту :id, видалення для адміністратора.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Book } from '../../../src/domain/book.js';
import { formatDate, formatPrice } from '../../../src/domain/format.js';
import { StoreError } from '../../../src/store/errors.js';
import { useAuth } from '../auth.tsx';
import type { BookData } from '../components/BookCard.tsx';

export function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { store, session } = useAuth();
  const [book, setBook] = useState<BookData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    store.get(Number(id)).then(setBook).catch((e) => setError(e instanceof StoreError ? e.message : 'Помилка завантаження'));
  }, [store, id]);

  async function remove() {
    if (!book || !confirm(`Видалити «${book.title}»?`)) return;
    try {
      await store.remove(book.id);
      navigate('/');
    } catch (e) {
      setError(e instanceof StoreError ? e.message : 'Не вдалося видалити');
    }
  }

  if (error) return <p className="status error" role="alert">{error} <Link to="/">До каталогу</Link></p>;
  if (!book) return <p className="status">Завантаження…</p>;
  const b = Book.from(book);
  return (
    <article className="card details">
      <h2>{b.title}</h2>
      <dl>
        <dt>Автор</dt><dd>{b.author}</dd>
        <dt>Жанр</dt><dd>{b.genreLabel}</dd>
        <dt>Рік видання</dt><dd>{b.year}</dd>
        <dt>ISBN</dt><dd>{b.isbn}</dd>
        <dt>Вартість</dt><dd>{formatPrice(b.price)}</dd>
        <dt>Дата надходження</dt><dd>{formatDate(b.receivedAt)}</dd>
        <dt>Стан</dt><dd>{b.isAvailable() ? 'доступна' : 'видана'}</dd>
      </dl>
      <div className="card-actions">
        <Link className="button" to="/">← До каталогу</Link>
        {session && <Link className="button" to={`/books/${b.id}/edit`}>Редагувати</Link>}
        {session?.user.role === 'admin' && <button type="button" className="danger" onClick={remove}>Видалити</button>}
      </div>
    </article>
  );
}
