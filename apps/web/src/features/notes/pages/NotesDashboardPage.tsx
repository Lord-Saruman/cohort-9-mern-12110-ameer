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
        <div className="dashboard-title-group">
          <h1 className="dashboard-title">
            <span>My Notes</span>
            {meta.total > 0 && (
              <span className="dashboard-count-badge">
                {meta.total} {meta.total === 1 ? 'Note' : 'Notes'}
              </span>
            )}
          </h1>
          <p className="dashboard-subtitle">
            Capture, organize, and search your thoughts securely.
          </p>
        </div>
        <Link to="/notes/new" className="btn btn-primary" data-testid="create-note-button">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
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
          <Spinner size={40} />
        </div>
      ) : error && notes.length === 0 ? null : notes.length === 0 ? (
        <div className="empty-state" data-testid="notes-empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            {searchQuery ? (
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#818cf8' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            ) : (
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#818cf8' }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            )}
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
