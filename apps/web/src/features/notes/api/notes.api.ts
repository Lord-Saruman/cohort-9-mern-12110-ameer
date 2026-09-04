import { apiClient } from '../../../shared/api/client';
import type {
  CreateNoteInput,
  ListNotesQuery,
  NoteDto,
  NotesListResult,
  NoteSummaryDto,
  UpdateNoteInput,
} from './notes.types';

export const notesApi = {
  async list(query: ListNotesQuery = {}): Promise<NotesListResult> {
    const params = new URLSearchParams();
    if (query.q && query.q.trim()) {
      params.set('q', query.q.trim());
    }
    if (query.page !== undefined && query.page > 0) {
      params.set('page', String(query.page));
    }
    if (query.pageSize !== undefined && query.pageSize > 0) {
      params.set('pageSize', String(query.pageSize));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/notes?${queryString}` : '/notes';

    const response = await apiClient.getWithMeta<NoteSummaryDto[]>(endpoint);
    return {
      notes: response.data ?? [],
      meta: response.meta ?? {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total: response.data?.length ?? 0,
      },
    };
  },

  async getById(noteId: string): Promise<NoteDto> {
    return apiClient.get<NoteDto>(`/notes/${encodeURIComponent(noteId)}`);
  },

  async create(input: CreateNoteInput): Promise<NoteDto> {
    return apiClient.post<NoteDto>('/notes', input);
  },

  async update(noteId: string, input: UpdateNoteInput): Promise<NoteDto> {
    return apiClient.patch<NoteDto>(`/notes/${encodeURIComponent(noteId)}`, input);
  },

  async delete(noteId: string): Promise<void> {
    return apiClient.delete<void>(`/notes/${encodeURIComponent(noteId)}`);
  },
};
