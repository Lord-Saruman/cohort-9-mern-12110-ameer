import type { RequestHandler, Response } from 'express';
import type { Pool } from 'mysql2/promise';

import { AppError } from '../../common/app-error';
import type { AppLocals } from '../../middleware/request-context';
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from './notes.schemas';
import {
  createNoteService,
  deleteNoteService,
  getNoteByIdService,
  listNotesService,
  updateNoteService,
} from './notes.service';

export interface NotesControllerOptions {
  pool: Pool;
}

export interface NotesController {
  create: RequestHandler<unknown, unknown, unknown, unknown, AppLocals>;
  list: RequestHandler<unknown, unknown, unknown, unknown, AppLocals>;
  getById: RequestHandler<{ noteId: string }, unknown, unknown, unknown, AppLocals>;
  update: RequestHandler<{ noteId: string }, unknown, unknown, unknown, AppLocals>;
  delete: RequestHandler<{ noteId: string }, unknown, unknown, unknown, AppLocals>;
}

const getAuthenticatedUserId = (response: Response<unknown, AppLocals>): string => {
  const userId = response.locals.user?.userId;
  if (!userId) {
    throw new AppError({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required to access this resource.',
    });
  }
  return userId;
};

export const createNotesController = ({ pool }: NotesControllerOptions): NotesController => {
  const create: RequestHandler<unknown, unknown, unknown, unknown, AppLocals> = async (
    request,
    response,
    next,
  ) => {
    try {
      const parsed = createNoteSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          details: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? 'body'),
            message: issue.message,
          })),
        });
      }

      const userId = getAuthenticatedUserId(response);
      const note = await createNoteService(pool, userId, parsed.data);
      response.status(201).json({ data: note });
    } catch (error: unknown) {
      next(error);
    }
  };

  const list: RequestHandler<unknown, unknown, unknown, unknown, AppLocals> = async (
    request,
    response,
    next,
  ) => {
    try {
      const parsed = listNotesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        throw new AppError({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters.',
          details: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? 'query'),
            message: issue.message,
          })),
        });
      }

      const userId = getAuthenticatedUserId(response);
      const result = await listNotesService(pool, userId, parsed.data);
      response.status(200).json({ data: result.notes, meta: result.meta });
    } catch (error: unknown) {
      next(error);
    }
  };

  const getById: RequestHandler<{ noteId: string }, unknown, unknown, unknown, AppLocals> = async (
    request,
    response,
    next,
  ) => {
    try {
      const userId = getAuthenticatedUserId(response);
      const note = await getNoteByIdService(pool, request.params.noteId, userId);
      response.status(200).json({ data: note });
    } catch (error: unknown) {
      next(error);
    }
  };

  const update: RequestHandler<{ noteId: string }, unknown, unknown, unknown, AppLocals> = async (
    request,
    response,
    next,
  ) => {
    try {
      const parsed = updateNoteSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          details: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? 'body'),
            message: issue.message,
          })),
        });
      }

      const userId = getAuthenticatedUserId(response);
      const note = await updateNoteService(pool, request.params.noteId, userId, parsed.data);
      response.status(200).json({ data: note });
    } catch (error: unknown) {
      next(error);
    }
  };

  const deleteHandler: RequestHandler<
    { noteId: string },
    unknown,
    unknown,
    unknown,
    AppLocals
  > = async (request, response, next) => {
    try {
      const userId = getAuthenticatedUserId(response);
      await deleteNoteService(pool, request.params.noteId, userId);
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  };

  return {
    create,
    list,
    getById,
    update,
    delete: deleteHandler,
  };
};
