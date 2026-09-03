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
  };

  const handleContentChange = (newContent: TipTapDoc) => {
    setContent(newContent);
    if (error) setError(null);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setError('Title must not exceed 200 characters.');
      return;
    }

    setSuccessMessage(null);
    try {
      const saved = await saveNote({ title: trimmedTitle, content });
      setSuccessMessage(isNew ? 'Note created successfully!' : 'Note saved successfully!');
      if (isNew) {
        navigate(`/notes/${saved.id}`, { replace: true });
      }
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await deleteNote();
      setIsDeleteModalOpen(false);
      navigate('/dashboard', { replace: true });
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="editor-loading" data-testid="editor-loading">
        <Spinner size={36} />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="dashboard-container" data-testid="note-not-found">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            ⚠️
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
            ← Back to Notes
          </Link>
          <span className="editor-mode-badge">{isNew ? 'New Note' : 'Editing Note'}</span>
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
              🗑️ Delete
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
          placeholder="Note title..."
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
