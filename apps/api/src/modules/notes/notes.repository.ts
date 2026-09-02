import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { AppError } from '../../common/app-error';
import type { NoteRecord } from './notes.schemas';

type NoteRow = RowDataPacket & NoteRecord;
type CountRow = RowDataPacket & { total: number };

export interface CreateNoteData {
  id: string;
  userId: string;
  title: string;
  contentJson: unknown;
  contentText: string;
}

export interface UpdateNoteData {
  title?: string;
  contentJson?: unknown;
  contentText?: string;
}

export interface ListNotesOptions {
  search?: string;
  page: number;
  pageSize: number;
}

export const createNote = async (pool: Pool, data: CreateNoteData): Promise<NoteRecord> => {
  await pool.execute(
    'INSERT INTO notes (id, user_id, title, content_json, content_text) VALUES (?, ?, ?, ?, ?)',
    [data.id, data.userId, data.title, JSON.stringify(data.contentJson), data.contentText],
  );

  const note = await findNoteByIdAndUserId(pool, data.id, data.userId);
  if (!note) {
    throw new AppError({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve newly created note.',
    });
  }

  return note;
};

export const findNoteByIdAndUserId = async (
  pool: Pool,
  id: string,
  userId: string,
): Promise<NoteRecord | null> => {
  const [rows] = await pool.execute<NoteRow[]>(
    'SELECT id, user_id, title, content_json, content_text, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?',
    [id, userId],
  );

  return rows[0] ?? null;
};

export const listNotesByUserId = async (
  pool: Pool,
  userId: string,
  options: ListNotesOptions,
): Promise<{ notes: NoteRecord[]; total: number }> => {
  const offset = (options.page - 1) * options.pageSize;

  if (options.search && options.search.length > 0) {
    const searchPattern = `%${options.search}%`;

    const [countRows] = await pool.execute<CountRow[]>(
      'SELECT COUNT(*) AS total FROM notes WHERE user_id = ? AND (title LIKE ? OR content_text LIKE ?)',
      [userId, searchPattern, searchPattern],
    );

    const [rows] = await pool.query<NoteRow[]>(
      'SELECT id, user_id, title, content_json, content_text, created_at, updated_at FROM notes WHERE user_id = ? AND (title LIKE ? OR content_text LIKE ?) ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [userId, searchPattern, searchPattern, options.pageSize, offset],
    );

    return {
      notes: rows,
      total: countRows[0]?.total ?? 0,
    };
  }

  const [countRows] = await pool.execute<CountRow[]>(
    'SELECT COUNT(*) AS total FROM notes WHERE user_id = ?',
    [userId],
  );

  const [rows] = await pool.query<NoteRow[]>(
    'SELECT id, user_id, title, content_json, content_text, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
    [userId, options.pageSize, offset],
  );

  return {
    notes: rows,
    total: countRows[0]?.total ?? 0,
  };
};

export const updateNote = async (
  pool: Pool,
  id: string,
  userId: string,
  data: UpdateNoteData,
): Promise<NoteRecord | null> => {
  const setClauses: string[] = [];
  const params: string[] = [];

  if (data.title !== undefined) {
    setClauses.push('title = ?');
    params.push(data.title);
  }

  if (data.contentJson !== undefined) {
    setClauses.push('content_json = ?');
    params.push(JSON.stringify(data.contentJson));
  }

  if (data.contentText !== undefined) {
    setClauses.push('content_text = ?');
    params.push(data.contentText);
  }

  if (setClauses.length === 0) {
    return findNoteByIdAndUserId(pool, id, userId);
  }

  params.push(id, userId);

  await pool.execute(
    `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`,
    params,
  );

  return findNoteByIdAndUserId(pool, id, userId);
};

export const deleteNote = async (pool: Pool, id: string, userId: string): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM notes WHERE id = ? AND user_id = ?',
    [id, userId],
  );

  return result.affectedRows > 0;
};
