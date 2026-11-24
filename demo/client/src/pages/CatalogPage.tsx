// Сторінка каталогу (практичне завдання № 6): пошук з затримкою, фільтр, сторінки і стани завантаження.
// Ефект (useEffect) запитує список щоразу, коли змінюються параметри, і скасовує попередній запит під час очищення.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { GENRES } from '../../../src/domain/book.js';
import { foundSummary } from '../../../src/domain/format.js';
import { StoreError } from '../../../src/store/errors.js';
import { useAuth } from '../auth.tsx';
import { BookCard } from '../components/BookCard.tsx';
import type { BookData } from '../components/BookCard.tsx';

const LIMIT = 6;
type Status = { kind: 'loading' } | { kind: 'ready'; items: BookData[]; total: number; page: number } | { kind: 'error'; message: string };

export function CatalogPage() {
  const { store, session } = useAuth();
  const [text, setText] = useState('');        // значення поля пошуку
  const [q, setQ] = useState('');              // текст, за яким шукаємо (після паузи)
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);   // «Спробувати ще раз» – новий запуск ефекту

  // debounce: запит після паузи 300 мс у наборі тексту
  useEffect(() => {
    const timer = setTimeout(() => { setQ(text); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus({ kind: 'loading' });
    store.list({ q, genre: genre || undefined, sort: 'title', order: 'asc', page, limit: LIMIT, signal: controller.signal })
      .then((result) => setStatus({ kind: 'ready', items: result.items, total: result.total, page: result.page }))
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;   // запит скасовано новим
        setStatus({ kind: 'error', message: error instanceof StoreError ? error.message : 'Сталася непередбачена помилка' });
      });
    return () => controller.abort();          // очищення ефекту: параметри змінилися або сторінку закрито
  }, [store, q, genre, page, attempt]);

  const pages = status.kind === 'ready' ? Math.max(1, Math.ceil(status.total / LIMIT)) : 1;

  return (
    <>
      <div className="toolbar">
        <label>Пошук
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Назва або автор" />
        </label>
        <label>Жанр
          <select value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }}>
            <option value="">Усі жанри</option>
            {Object.entries(GENRES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {session && <Link className="button primary" to="/books/new">Додати книгу</Link>}
      </div>

      <div className={`status${status.kind === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
        {status.kind === 'loading' && 'Завантаження…'}
        {status.kind === 'ready' && (status.total === 0 ? 'Нічого не знайдено' : foundSummary(status.total))}
        {status.kind === 'error' && <>{status.message} <button type="button" onClick={() => setAttempt((n) => n + 1)}>Спробувати ще раз</button></>}
      </div>

      {status.kind === 'ready' && (
        <ul className="cards" aria-label="Книги">
          {status.items.map((book) => <BookCard key={book.id} data={book} />)}
        </ul>
      )}

      <nav className="pager" aria-label="Сторінки каталогу">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Попередня</button>
        <span>Сторінка {status.kind === 'ready' ? status.page : page} з {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Наступна →</button>
      </nav>
    </>
  );
}
