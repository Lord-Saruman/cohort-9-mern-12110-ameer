import type { FC } from 'react';
import { Link } from 'react-router-dom';

import type { NoteSummaryDto } from '../api/notes.types';

export interface NoteCardProps {
  note: NoteSummaryDto;
}

export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
};

export const NoteCard: FC<NoteCardProps> = ({ note }) => {
  return (
    <Link to={`/notes/${note.id}`} className="note-card" data-testid={`note-card-${note.id}`}>
      <article className="note-card-content">
        <h2 className="note-card-title">{note.title}</h2>
        <p className="note-card-preview">{note.preview || 'No content preview available.'}</p>
        <footer className="note-card-footer">
          <time dateTime={note.updatedAt} className="note-card-time">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Updated {formatDate(note.updatedAt)}
          </time>
          <div
            style={{ display: 'flex', alignItems: 'center', color: '#818cf8', opacity: 0.7 }}
            aria-hidden="true"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </footer>
      </article>
    </Link>
  );
};
