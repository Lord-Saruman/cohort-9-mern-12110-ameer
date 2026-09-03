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
    <Link
      to={`/notes/${note.id}`}
      className="note-card"
      data-testid={`note-card-${note.id}`}
      aria-label={`Note: ${note.title}`}
    >
      <article className="note-card-content">
        <h2 className="note-card-title">{note.title}</h2>
        <p className="note-card-preview">{note.preview || 'No content preview available.'}</p>
        <footer className="note-card-footer">
          <time dateTime={note.updatedAt} className="note-card-time">
            Updated {formatDate(note.updatedAt)}
          </time>
        </footer>
      </article>
    </Link>
  );
};
