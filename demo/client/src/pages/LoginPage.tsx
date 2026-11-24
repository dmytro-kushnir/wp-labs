// Сторінка входу (практичне завдання № 6): після входу – повернення на сторінку з параметра ?next=.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth.tsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await login(String(data.get('email')), String(data.get('password')));
      navigate(params.get('next') ?? '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося увійти');
    }
  }

  return (
    <form className="card form narrow" onSubmit={submit}>
      <h2>Вхід</h2>
      <label>Електронна пошта <input name="email" type="email" required autoComplete="username" /></label>
      <label>Пароль <input name="password" type="password" required minLength={8} autoComplete="current-password" /></label>
      <p className="error" role="alert">{error}</p>
      <div className="actions"><button type="submit" className="primary">Увійти</button></div>
    </form>
  );
}
