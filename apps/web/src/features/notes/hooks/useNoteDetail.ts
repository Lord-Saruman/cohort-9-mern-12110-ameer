import { useCallback, useEffect, useState } from 'react';

import { ApiClientError } from '../../../shared/api/client';
import { notesApi } from '../api/notes.api';
import {
  EMPTY_NOTE_DOC,
  type CreateNoteInput,
  type NoteDto,
  type TipTapDoc,
  type UpdateNoteInput,
} from '../api/notes.types';

export interface UseNoteDetailOptions {
  noteId?: string;
}

export interface UseNoteDetailResult {
  note: NoteDto | null;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isNotFound: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  saveNote: (input: { title: string; content: TipTapDoc }) => Promise<NoteDto>;
  deleteNote: () => Promise<void>;
}

const MAX_SERIALIZED_CONTENT_BYTES = 100 * 1024;

const getByteLength = (str: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return typeof Buffer !== 'undefined' ? Buffer.byteLength(str, 'utf8') : str.length;
};

export const useNoteDetail = (options: UseNoteDetailOptions = {}): UseNoteDetailResult => {
  const { noteId } = options;
  const isNew = !noteId || noteId === 'new';

  const [note, setNote] = useState<NoteDto | null>(() => {
    if (isNew) {
      return {
        id: 'new',
        title: '',
        content: EMPTY_NOTE_DOC,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!isNew);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setNote({
        id: 'new',
        title: '',
        content: EMPTY_NOTE_DOC,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsLoading(false);
      setIsNotFound(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setIsNotFound(false);
    setError(null);

    notesApi
      .getById(noteId)
      .then((data) => {
        if (isMounted) {
          setNote(data);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const status =
          err instanceof ApiClientError ? err.status : (err as { status?: number })?.status;

        if (status === 404) {
          setIsNotFound(true);
        } else {
          const message = err instanceof Error ? err.message : 'Failed to load note details.';
          setError(message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [noteId, isNew]);

  const saveNote = useCallback(
    async (input: { title: string; content: TipTapDoc }): Promise<NoteDto> => {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new Error('Title is required.');
      }
      if (trimmedTitle.length > 200) {
        throw new Error('Title must not exceed 200 characters.');
      }

      const serialized = JSON.stringify(input.content);
      const contentBytes = getByteLength(serialized);
      if (contentBytes > MAX_SERIALIZED_CONTENT_BYTES) {
        throw new Error('Note content must not exceed 100 KB.');
      }

      setIsSaving(true);
      setError(null);

      try {
        let saved: NoteDto;
        if (isNew) {
          const payload: CreateNoteInput = {
            title: trimmedTitle,
            content: input.content,
          };
          saved = await notesApi.create(payload);
        } else {
          const payload: UpdateNoteInput = {
            title: trimmedTitle,
            content: input.content,
          };
          saved = await notesApi.update(noteId, payload);
        }

        setNote(saved);
        return saved;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to save note. Please check your connection.';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [isNew, noteId],
  );

  const deleteNote = useCallback(async (): Promise<void> => {
    if (isNew || !noteId) return;

    setIsDeleting(true);
    setError(null);

    try {
      await notesApi.delete(noteId);
      setNote(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete note.';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [isNew, noteId]);

  return {
    note,
    isLoading,
    isSaving,
    isDeleting,
    isNotFound,
    error,
    setError,
    saveNote,
    deleteNote,
  };
};
