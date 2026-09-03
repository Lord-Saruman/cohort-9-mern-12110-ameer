import type { FC } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { NoteGrid } from '../components/NoteGrid';
import { NotesPagination } from '../components/NotesPagination';
import { NotesSearch } from '../components/NotesSearch';
import { useNotesList } from '../hooks/useNotesList';

export const NotesDashboardPage: FC = () => {
  const { notes, meta, searchQuery, setSearchQuery, page, setPage, isLoading, error, reload } =
    useNotesList();

  return (
    <div className="dashboard-container" data-testid="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Notes</h1>
          <p className="dashboard-subtitle">Capture and organize your thoughts securely.</p>
        </div>
        <Link to="/notes/new" className="btn btn-primary" data-testid="create-note-button">
          + New Note
        </Link>
      </header>

      <section className="dashboard-controls" aria-label="Notes search and filters">
        <NotesSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          disabled={isLoading}
        />
      </section>

      {error && (
        <div className="dashboard-error-wrapper" data-testid="notes-error">
          <Alert variant="danger">
            <div className="dashboard-error-content">
              <span>{error}</span>
              <Button
                variant="secondary"
                className="btn-sm"
                onClick={() => void reload()}
                data-testid="retry-button"
              >
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-loading" data-testid="notes-loading">
          <Spinner size={36} />
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state" data-testid="notes-empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            {searchQuery ? '🔍' : '📝'}
          </div>
          <h2 className="empty-state-title">
            {searchQuery ? 'No matching notes found' : 'No notes yet'}
          </h2>
          <p className="empty-state-text">
            {searchQuery
              ? `We couldn't find any notes matching "${searchQuery}". Try a different keyword.`
              : 'Start your private workspace by creating your first rich-text note.'}
          </p>
          {searchQuery ? (
            <Button
              variant="secondary"
              onClick={() => setSearchQuery('')}
              data-testid="clear-search-button"
            >
              Clear Search
            </Button>
          ) : (
            <Link
              to="/notes/new"
              className="btn btn-primary"
              data-testid="empty-create-note-button"
            >
              Create Your First Note
            </Link>
          )}
        </div>
      ) : (
        <>
          <NoteGrid notes={notes} />
          <NotesPagination
            page={page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
            disabled={isLoading}
          />
        </>
      )}
    </div>
  );
};
