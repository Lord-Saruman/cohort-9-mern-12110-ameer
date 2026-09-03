import { act, renderHook, waitFor } from '@testing-library/react';

import { notesApi } from '../src/features/notes/api/notes.api';
import type { NoteDto, NoteSummaryDto, TipTapDoc } from '../src/features/notes/api/notes.types';
import { useNoteDetail } from '../src/features/notes/hooks/useNoteDetail';
import { useNotesList } from '../src/features/notes/hooks/useNotesList';
import { apiClient, ApiClientError } from '../src/shared/api/client';

const sampleDoc: TipTapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', text: 'Hello world' }],
};

const mockSummary: NoteSummaryDto = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Test Note',
  preview: 'Hello world preview',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

const mockNote: NoteDto = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Test Note',
  content: sampleDoc,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

describe('notesApi', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists notes with default parameters and encodes query parameters properly', async () => {
    const getWithMetaSpy = jest.spyOn(apiClient, 'getWithMeta').mockResolvedValue({
      data: [mockSummary],
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const result = await notesApi.list({ q: 'meeting', page: 2, pageSize: 10 });

    expect(getWithMetaSpy).toHaveBeenCalledWith('/notes?q=meeting&page=2&pageSize=10');
    expect(result.notes).toHaveLength(1);
    expect(result.meta.total).toBe(1);

    await notesApi.list({});
    expect(getWithMetaSpy).toHaveBeenCalledWith('/notes');
  });

  it('fetches, creates, updates, and deletes notes', async () => {
    const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValue(mockNote);
    const postSpy = jest.spyOn(apiClient, 'post').mockResolvedValue(mockNote);
    const patchSpy = jest.spyOn(apiClient, 'patch').mockResolvedValue(mockNote);
    const deleteSpy = jest.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

    const fetched = await notesApi.getById('11111111-1111-1111-1111-111111111111');
    expect(getSpy).toHaveBeenCalledWith('/notes/11111111-1111-1111-1111-111111111111');
    expect(fetched.title).toBe('Test Note');

    const created = await notesApi.create({ title: 'New', content: sampleDoc });
    expect(postSpy).toHaveBeenCalledWith('/notes', { title: 'New', content: sampleDoc });
    expect(created.title).toBe('Test Note');

    const updated = await notesApi.update('11111111-1111-1111-1111-111111111111', {
      title: 'Updated',
    });
    expect(patchSpy).toHaveBeenCalledWith('/notes/11111111-1111-1111-1111-111111111111', {
      title: 'Updated',
    });
    expect(updated.title).toBe('Test Note');

    await notesApi.delete('11111111-1111-1111-1111-111111111111');
    expect(deleteSpy).toHaveBeenCalledWith('/notes/11111111-1111-1111-1111-111111111111');
  });
});

describe('useNotesList', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches notes on mount and handles debounced search query and page change', async () => {
    const listSpy = jest.spyOn(notesApi, 'list').mockResolvedValue({
      notes: [mockSummary],
      meta: { page: 1, pageSize: 20, total: 1 },
    });

    const { result } = renderHook(() => useNotesList({ debounceMs: 50 }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notes).toEqual([mockSummary]);
    expect(listSpy).toHaveBeenCalledWith({ q: '', page: 1, pageSize: 20 });

    act(() => {
      result.current.setSearchQuery('test query');
    });

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({ q: 'test query', page: 1, pageSize: 20 });
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({ q: 'test query', page: 2, pageSize: 20 });
    });
  });

  it('handles error in notes listing', async () => {
    jest.spyOn(notesApi, 'list').mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useNotesList({ debounceMs: 10 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.notes).toEqual([]);
  });
});

describe('useNoteDetail', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes in create mode with empty note', () => {
    const { result } = renderHook(() => useNoteDetail({ noteId: 'new' }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.note?.id).toBe('new');
    expect(result.current.note?.title).toBe('');
  });

  it('fetches note in edit mode and handles 404', async () => {
    jest
      .spyOn(notesApi, 'getById')
      .mockRejectedValue(new ApiClientError(404, 'NOT_FOUND', 'Note not found'));

    const { result } = renderHook(() =>
      useNoteDetail({ noteId: '00000000-0000-0000-0000-000000000000' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isNotFound).toBe(true);
    expect(result.current.note).toBeNull();
  });

  it('validates title and content size when saving', async () => {
    const { result } = renderHook(() => useNoteDetail({ noteId: 'new' }));

    await act(async () => {
      await expect(result.current.saveNote({ title: '   ', content: sampleDoc })).rejects.toThrow(
        'Title is required.',
      );
    });

    await act(async () => {
      await expect(
        result.current.saveNote({ title: 'a'.repeat(201), content: sampleDoc }),
      ).rejects.toThrow('Title must not exceed 200 characters.');
    });

    const hugeDoc: TipTapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', text: 'x'.repeat(105 * 1024) }],
    };
    await act(async () => {
      await expect(
        result.current.saveNote({ title: 'Valid Title', content: hugeDoc }),
      ).rejects.toThrow('Note content must not exceed 100 KB.');
    });
  });

  it('saves new note and deletes existing note', async () => {
    const createSpy = jest.spyOn(notesApi, 'create').mockResolvedValue(mockNote);
    const deleteSpy = jest.spyOn(notesApi, 'delete').mockResolvedValue(undefined);

    const { result } = renderHook(() => useNoteDetail({ noteId: 'new' }));

    let saved: NoteDto | undefined;
    await act(async () => {
      saved = await result.current.saveNote({ title: 'Valid Title', content: sampleDoc });
    });

    expect(createSpy).toHaveBeenCalledWith({ title: 'Valid Title', content: sampleDoc });
    expect(saved?.id).toBe(mockNote.id);

    const { result: detailResult } = renderHook(() => useNoteDetail({ noteId: mockNote.id }));

    jest.spyOn(notesApi, 'getById').mockResolvedValue(mockNote);

    const updateSpy = jest.spyOn(notesApi, 'update').mockResolvedValue({
      ...mockNote,
      title: 'Updated Title',
    });

    let updatedNote: NoteDto | undefined;
    await act(async () => {
      updatedNote = await detailResult.current.saveNote({
        title: 'Updated Title',
        content: sampleDoc,
      });
    });

    expect(updateSpy).toHaveBeenCalledWith(mockNote.id, {
      title: 'Updated Title',
      content: sampleDoc,
    });
    expect(updatedNote?.title).toBe('Updated Title');

    await act(async () => {
      await detailResult.current.deleteNote();
    });

    expect(deleteSpy).toHaveBeenCalledWith(mockNote.id);
    expect(detailResult.current.note).toBeNull();
  });

  it('handles errors when saving and deleting notes', async () => {
    jest.spyOn(notesApi, 'create').mockRejectedValue(new Error('Save failed'));
    jest.spyOn(notesApi, 'delete').mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useNoteDetail({ noteId: 'new' }));

    await act(async () => {
      try {
        await result.current.saveNote({ title: 'Title', content: sampleDoc });
      } catch {}
    });

    expect(result.current.error).toBe('Save failed');

    jest.spyOn(notesApi, 'getById').mockResolvedValue(mockNote);
    const { result: detailResult } = renderHook(() => useNoteDetail({ noteId: mockNote.id }));

    await waitFor(() => {
      expect(detailResult.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await detailResult.current.deleteNote();
      } catch {}
    });

    expect(detailResult.current.error).toBe('Delete failed');
  });

  it('handles empty response in notesApi.list gracefully', async () => {
    jest.spyOn(apiClient, 'getWithMeta').mockResolvedValue({
      data: undefined as unknown as NoteSummaryDto[],
      meta: undefined,
    });

    const result = await notesApi.list();
    expect(result.notes).toEqual([]);
    expect(result.meta.page).toBe(1);
    expect(result.meta.pageSize).toBe(20);
    expect(result.meta.total).toBe(0);
  });
});
