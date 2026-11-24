// Форма створення і редагування книги (практичне завдання № 6): кероване поле форми зберігає значення в стані React,
// перевірка – та сама функція validateBook (ПЗ 1), помилки сервера показуються біля полів.
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GENRES } from '../../../src/domain/book.js';
import { validateBook } from '../../../src/domain/validate.js';
import { StoreError } from '../../../src/store/errors.js';
import { useAuth } from '../auth.tsx';

const EMPTY = { title: '', author: '', year: '', price: '', isbn: '', genre: '', receivedAt: '', available: true };
type FormState = typeof EMPTY;
type Errors = Partial<Record<keyof FormState | 'form', string>>;

/** Рядки полів форми → дані книги з потрібними типами. */
const toBook = (f: FormState) => ({
  title: f.title.trim(), author: f.author.trim(), year: f.year === '' ? Number.NaN : Number(f.year),
  price: f.price === '' ? Number.NaN : Number(f.price), isbn: f.isbn.replaceAll('-', '').trim(),
  genre: f.genre, receivedAt: f.receivedAt, available: f.available,
});

export function BookFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const { store } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    store.get(Number(id)).then((b) => setForm({ ...b, year: String(b.year), price: String(b.price) }));
  }, [store, id, editing]);

  const set = (name: keyof FormState) => (e: { target: { value: string; checked?: boolean; type?: string } }) =>
    setForm((f) => ({ ...f, [name]: e.target.type === 'checkbox' ? Boolean(e.target.checked) : e.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const data = toBook(form);
    setSaving(true);
    try {
      // індивідуальне правило № 1: кандидати зі схожою назвою з сервера
      const existing = data.title ? (await store.list({ q: data.title, limit: 100 })).items : [];
      const found = validateBook({ ...data, id: editing ? Number(id) : null }, { existing });
      if (found.length) {
        setErrors(Object.fromEntries(found.map((e) => [e.field, e.message])));
        return;
      }
      const saved = editing ? await store.update(Number(id), data) : await store.create(data);
      navigate(`/books/${saved.id}`);
    } catch (error) {
      if (error instanceof StoreError && error.status === 401) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
      if (error instanceof StoreError && error.details.length) setErrors(Object.fromEntries(error.details.map((e) => [e.field, e.message])));
      else setErrors({ form: error instanceof Error ? error.message : 'Не вдалося зберегти' });
    } finally {
      setSaving(false);
    }
  }

  const field = (name: keyof FormState, label: string, props: Record<string, string> = {}) => (
    <label>{label}
      <input name={name} value={String(form[name])} onChange={set(name)} aria-invalid={errors[name] ? true : undefined}
        aria-describedby={`err-${name}`} {...props} />
      <span className="error" id={`err-${name}`}>{errors[name]}</span>
    </label>
  );

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>{editing ? 'Редагування книги' : 'Нова книга'}</h2>
      {field('title', 'Назва')}
      {field('author', 'Автор')}
      <div className="row">
        {field('year', 'Рік видання', { type: 'number', min: '1450' })}
        {field('price', 'Вартість, грн', { type: 'number', min: '0', step: '0.01' })}
      </div>
      {field('isbn', 'ISBN-13', { inputMode: 'numeric' })}
      <div className="row">
        <label>Жанр
          <select name="genre" value={form.genre} onChange={set('genre')} aria-invalid={errors.genre ? true : undefined} aria-describedby="err-genre">
            <option value="">Оберіть жанр</option>
            {Object.entries(GENRES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <span className="error" id="err-genre">{errors.genre}</span>
        </label>
        {field('receivedAt', 'Дата надходження', { type: 'date' })}
      </div>
      <label className="check"><input type="checkbox" checked={form.available} onChange={set('available')} /> Доступна для видачі</label>
      <p className="error" role="alert">{errors.form}</p>
      <div className="actions">
        <button type="button" onClick={() => navigate(-1)}>Скасувати</button>
        <button type="submit" className="primary" disabled={saving}>Зберегти</button>
      </div>
    </form>
  );
}
