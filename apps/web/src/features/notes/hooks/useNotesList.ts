import { useCallback, useEffect, useRef, useState } from 'react';

import { notesApi } from '../api/notes.api';
import type { NoteSummaryDto, PaginationMeta } from '../api/notes.types';

export interface UseNotesListOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSearch?: string;
  debounceMs?: number;
}

export interface UseNotesListResult {
  notes: NoteSummaryDto[];
  meta: PaginationMeta;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const useNotesList = (options: UseNotesListOptions = {}): UseNotesListResult => {
  const { initialPage = 1, initialPageSize = 20, initialSearch = '', debounceMs = 300 } = options;

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [notes, setNotes] = useState<NoteSummaryDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchQuery) {
          setPage(1);
        }
        return searchQuery;
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const requestIdRef = useRef(0);

  const fetchNotes = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await notesApi.list({
        q: debouncedSearch,
        page,
        pageSize,
      });

      if (currentRequestId === requestIdRef.current) {
        setNotes(result.notes);
        setMeta(result.meta);
      }
    } catch (err: unknown) {
      if (currentRequestId === requestIdRef.current) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load notes. Please check your connection.';
        setError(message);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, page, pageSize]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    meta,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    isLoading,
    error,
    reload: fetchNotes,
  };
};
