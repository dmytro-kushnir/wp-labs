// ПЗ 6. Корінь застосунку React: шапка і маршрути. Зразок – demo/client/src/App.tsx.
// Повторно використовуйте модулі ПЗ 1–3: ../../src/domain (перевірка, форматування), ../../src/api, ../../src/store.
import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';

interface Item { id: number; title: string }

/** Мінімальний список, щоб перевірити зв’язок з сервером (npm run server + npm run client). Замініть сторінкою каталогу. */
function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/items?limit=6', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((page) => setItems(page.items))
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, []);
  if (error) return <p role="alert">Помилка: {error}</p>;
  return <ul>{items.map((item) => <li key={item.id}>{item.title}</li>)}</ul>;
}

export function App() {
  return (
    <main>
      <h1>[Назва вашого каталогу]</h1>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        {/* TODO: /items/:id, /items/new, /items/:id/edit, /login, * – сторінка «не знайдено» */}
      </Routes>
    </main>
  );
}
