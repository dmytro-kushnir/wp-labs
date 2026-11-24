// Репозиторій користувачів і ключів пристроїв (практичне завдання № 5).
// Хеш пароля ніколи не покидає цей модуль: назовні повертаються лише id, email і роль.
import type { DatabaseSync } from 'node:sqlite';
import type { AuthUser } from './auth.ts';

interface UserRow { id: number; email: string; password_hash: string; role: 'user' | 'admin' }

export function createUsers(db: DatabaseSync) {
  const byEmail = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?');
  const byId = db.prepare('SELECT id, email, role FROM users WHERE id = ?');
  const insert = db.prepare('INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)');
  const keyByHash = db.prepare('SELECT id, name FROM api_keys WHERE key_hash = ?');
  const insertKey = db.prepare('INSERT INTO api_keys (name, key_hash, created_at) VALUES (?, ?, ?)');

  return {
    /** Користувач разом із хешем пароля – лише для перевірки під час входу. */
    findForLogin: (email: string) => byEmail.get(email.toLowerCase()) as unknown as UserRow | undefined,
    get: (id: number) => byId.get(id) as unknown as AuthUser | undefined,
    create(email: string, passwordHash: string, role: 'user' | 'admin' = 'user'): AuthUser {
      const { lastInsertRowid } = insert.run(email.toLowerCase(), passwordHash, role, new Date().toISOString());
      return { id: Number(lastInsertRowid), email: email.toLowerCase(), role };
    },
    findApiKey: (hash: string) => keyByHash.get(hash) as unknown as { id: number; name: string } | undefined,
    createApiKey(name: string, hash: string) {
      const { lastInsertRowid } = insertKey.run(name, hash, new Date().toISOString());
      return { id: Number(lastInsertRowid), name };
    },
  };
}

export type Users = ReturnType<typeof createUsers>;
