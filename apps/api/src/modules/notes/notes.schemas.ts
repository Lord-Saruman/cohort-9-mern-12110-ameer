import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title must not exceed 200 characters.'),
  content: z.record(z.unknown()),
  contentText: z.string().max(50000, 'Content text must not exceed 50,000 characters.').optional(),
});

export const updateNoteSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty.')
      .max(200, 'Title must not exceed 200 characters.')
      .optional(),
    content: z.record(z.unknown()).optional(),
    contentText: z
      .string()
      .max(50000, 'Content text must not exceed 50,000 characters.')
      .optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined || data.content !== undefined || data.contentText !== undefined,
    {
      message: 'At least one field must be provided to update.',
    },
  );

export const listNotesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

export interface NoteRecord {
  id: string;
  user_id: string;
  title: string;
  content_json: unknown;
  content_text: string;
  created_at: Date;
  updated_at: Date;
}

export interface NoteDto {
  id: string;
  title: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface NoteSummaryDto {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export const extractPlainText = (content: unknown): string => {
  if (typeof content !== 'object' || content === null) {
    return '';
  }

  const chunks: string[] = [];

  const traverse = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) return;
    if ('text' in node && typeof (node as { text: unknown }).text === 'string') {
      chunks.push((node as { text: string }).text);
    }
    if ('content' in node && Array.isArray((node as { content: unknown }).content)) {
      for (const child of (node as { content: unknown[] }).content) {
        traverse(child);
      }
    }
  };

  traverse(content);
  return chunks.join(' ').trim();
};

export const toNoteDto = (record: NoteRecord): NoteDto => ({
  id: record.id,
  title: record.title,
  content:
    typeof record.content_json === 'string' ? JSON.parse(record.content_json) : record.content_json,
  createdAt: record.created_at.toISOString(),
  updatedAt: record.updated_at.toISOString(),
});

export const toNoteSummaryDto = (record: NoteRecord): NoteSummaryDto => ({
  id: record.id,
  title: record.title,
  preview: record.content_text.slice(0, 200),
  createdAt: record.created_at.toISOString(),
  updatedAt: record.updated_at.toISOString(),
});
