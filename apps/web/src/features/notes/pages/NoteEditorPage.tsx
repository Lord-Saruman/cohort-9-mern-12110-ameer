import { useEffect, useState, type FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EMPTY_NOTE_DOC, type TipTapDoc } from '../api/notes.types';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { RichTextEditor } from '../components/RichTextEditor';
import { useNoteDetail } from '../hooks/useNoteDetail';

export const NoteEditorPage: FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const isNew = !noteId || noteId === 'new';

  const {
    note,
    isLoading,
    isSaving,
    isDeleting,
    isNotFound,
    error,
    setError,
    saveNote,
    deleteNote,
  } = useNoteDetail({ noteId });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<TipTapDoc>(EMPTY_NOTE_DOC);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleContentChange = (newContent: TipTapDoc) => {
    setContent(newContent);
  };

  const handleSave = async () => {
    setSuccessMessage(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setError('Title must not exceed 200 characters.');
      return;
    }

    try {
      const saved = await saveNote({ title: trimmedTitle, content });
      setSuccessMessage(isNew ? 'Note created successfully!' : 'Note saved successfully!');
      if (isNew) {
        navigate(`/notes/${saved.id}`, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save note.';
      setError(msg);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote();
      setIsDeleteModalOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setIsDeleteModalOpen(false);
      const msg = err instanceof Error ? err.message : 'Failed to delete note.';
      setError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="editor-loading" data-testid="editor-loading">
        <Spinner size={40} />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="dashboard-container" data-testid="note-not-found">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="empty-state-title">Note Not Found</h1>
          <p className="empty-state-text">
            The note you requested does not exist or you do not have permission to view it.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container" data-testid="note-editor-page">
      <header className="editor-header">
        <div className="editor-header-nav">
          <Link
            to="/dashboard"
            className="btn btn-secondary btn-sm"
            data-testid="back-to-dashboard"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            ← Back to Notes
          </Link>
          <span className="editor-mode-badge">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isNew ? '#818cf8' : '#34d399',
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
            {isNew ? 'New Note' : 'Editing Note'}
          </span>
        </div>

        <div className="editor-header-actions">
          {!isNew && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-delete-trigger"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSaving || isDeleting}
              data-testid="delete-note-button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete
            </button>
          )}

          <Button
            variant="primary"
            className="btn-sm"
            onClick={() => void handleSave()}
            isLoading={isSaving}
            disabled={isSaving || isDeleting || !title.trim()}
            data-testid="save-note-button"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {isNew ? 'Create Note' : 'Save Changes'}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="danger" id="editor-error-alert">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" id="editor-success-alert">
          {successMessage}
        </Alert>
      )}

      <div className="editor-title-container">
        <label htmlFor="note-title-input" className="sr-only">
          Note Title
        </label>
        <input
          id="note-title-input"
          type="text"
          className="editor-title-input"
          placeholder="Untitled Note..."
          maxLength={200}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={isSaving || isDeleting}
          data-testid="note-title-input"
        />
        <span className="editor-char-counter" aria-live="polite" data-testid="note-title-counter">
          {title.length}/200
        </span>
      </div>

      <RichTextEditor
        content={content}
        onChange={handleContentChange}
        editable={!isSaving && !isDeleting}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        noteTitle={title}
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
