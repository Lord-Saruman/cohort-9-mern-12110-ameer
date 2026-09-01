import type { Pool, RowDataPacket } from 'mysql2/promise';

import type { UserRecord } from './auth.schemas';

type UserRow = RowDataPacket & UserRecord;

export interface CreateUserData {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export const createUser = async (pool: Pool, data: CreateUserData): Promise<UserRecord> => {
  await pool.execute('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [
    data.id,
    data.name,
    data.email,
    data.passwordHash,
  ]);

  const user = await findUserById(pool, data.id);
  if (!user) {
    throw new Error('User creation failed to persist record.');
  }

  return user;
};

export const findUserByEmail = async (pool: Pool, email: string): Promise<UserRecord | null> => {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
    [email],
  );

  return rows[0] ?? null;
};

export const findUserById = async (pool: Pool, id: string): Promise<UserRecord | null> => {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE id = ?',
    [id],
  );

  return rows[0] ?? null;
};
