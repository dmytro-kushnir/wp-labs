// Корінь застосунку React (практичне завдання № 6): шапка і маршрути сторінок.
import { Link, Route, Routes } from 'react-router';
import { useAuth } from './auth.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { BookPage } from './pages/BookPage.tsx';
import { BookFormPage } from './pages/BookFormPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';

function Header() {
  const { session, logout } = useAuth();
  return (
    <header className="app-header">
      <h1><Link to="/">Бібліотека</Link></h1>
      <div className="header-actions">
        {session ? (
          <>
            <span className="summary">{session.user.email} ({session.user.role === 'admin' ? 'адміністратор' : 'користувач'})</span>
            <button type="button" onClick={logout}>Вийти</button>
          </>
        ) : <Link className="button" to="/login">Увійти</Link>}
      </div>
    </header>
  );
}

export function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/books/new" element={<BookFormPage />} />
          <Route path="/books/:id" element={<BookPage />} />
          <Route path="/books/:id/edit" element={<BookFormPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p className="status">Сторінку не знайдено. <Link to="/">До каталогу</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
