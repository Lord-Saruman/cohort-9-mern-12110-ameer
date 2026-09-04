import type { FC } from 'react';

import type { NoteSummaryDto } from '../api/notes.types';
import { NoteCard } from './NoteCard';

export interface NoteGridProps {
  notes: NoteSummaryDto[];
}

export const NoteGrid: FC<NoteGridProps> = ({ notes }) => {
  return (
    <div className="notes-grid" data-testid="notes-grid" role="region" aria-label="Notes list">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
};
