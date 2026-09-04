import { useEffect, useRef, type FC } from 'react';

import { Button } from '../../../shared/components/Button';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  noteTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: FC<DeleteConfirmModalProps> = ({
  isOpen,
  noteTitle,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onCancel();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (first && last) {
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
      data-testid="modal-backdrop"
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        ref={modalRef}
        data-testid="delete-confirm-modal"
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.15rem',
          }}
          aria-hidden="true"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <div className="modal-header">
          <h2 id="delete-dialog-title" className="modal-title">
            Delete Note
          </h2>
        </div>

        <div className="modal-body">
          <p id="delete-dialog-description" className="modal-description">
            Are you sure you want to delete <strong>{noteTitle || 'this note'}</strong>? This action
            cannot be undone.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            ref={cancelButtonRef}
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid="cancel-delete-button"
          >
            Cancel
          </button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
            data-testid="confirm-delete-button"
          >
            Delete Note
          </Button>
        </div>
      </div>
    </div>
  );
};
