import type { PaginationMeta } from '../../../shared/api/types';

export type { PaginationMeta };

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TipTapMark[];
}

export interface TipTapDoc {
  type: 'doc';
  content?: TipTapNode[];
}

export interface NoteSummaryDto {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDto {
  id: string;
  title: string;
  content: TipTapDoc;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotesQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateNoteInput {
  title: string;
  content: TipTapDoc;
}

export interface UpdateNoteInput {
  title?: string;
  content?: TipTapDoc;
}

export interface NotesListResult {
  notes: NoteSummaryDto[];
  meta: PaginationMeta;
}

export const EMPTY_NOTE_DOC: TipTapDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};
