import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';

import { AppError } from '../../common/app-error';
import {
  createNote,
  deleteNote,
  findNoteByIdAndUserId,
  listNotesByUserId,
  updateNote,
} from './notes.repository';
import {
  extractPlainText,
  toNoteDto,
  toNoteSummaryDto,
  type CreateNoteInput,
  type ListNotesQuery,
  type NoteDto,
  type NoteSummaryDto,
  type PaginationMeta,
  type UpdateNoteInput,
} from './notes.schemas';

export const createNoteService = async (
  pool: Pool,
  userId: string,
  input: CreateNoteInput,
): Promise<NoteDto> => {
  const id = randomUUID();
  const contentText = extractPlainText(input.content);

  const record = await createNote(pool, {
    id,
    userId,
    title: input.title,
    contentJson: input.content,
    contentText,
  });

  return toNoteDto(record);
};

export const getNoteByIdService = async (
  pool: Pool,
  id: string,
  userId: string,
): Promise<NoteDto> => {
  const record = await findNoteByIdAndUserId(pool, id, userId);
  if (!record) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Note not found.',
    });
  }

  return toNoteDto(record);
};

export const listNotesService = async (
  pool: Pool,
  userId: string,
  query: ListNotesQuery,
): Promise<{ notes: NoteSummaryDto[]; meta: PaginationMeta }> => {
  const result = await listNotesByUserId(pool, userId, {
    search: query.q,
    page: query.page,
    pageSize: query.pageSize,
  });

  return {
    notes: result.notes.map(toNoteSummaryDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
    },
  };
};

export const updateNoteService = async (
  pool: Pool,
  id: string,
  userId: string,
  input: UpdateNoteInput,
): Promise<NoteDto> => {
  const existing = await findNoteByIdAndUserId(pool, id, userId);
  if (!existing) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Note not found.',
    });
  }

  const contentText = input.content !== undefined ? extractPlainText(input.content) : undefined;

  const updated = await updateNote(pool, id, userId, {
    title: input.title,
    contentJson: input.content,
    contentText,
  });

  if (!updated) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Note not found.',
    });
  }

  return toNoteDto(updated);
};

export const deleteNoteService = async (pool: Pool, id: string, userId: string): Promise<void> => {
  const deleted = await deleteNote(pool, id, userId);
  if (!deleted) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Note not found.',
    });
  }
};
