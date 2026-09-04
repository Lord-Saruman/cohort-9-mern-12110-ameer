import type { FC } from 'react';

export interface NotesSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const NotesSearch: FC<NotesSearchProps> = ({
  value,
  onChange,
  onClear,
  disabled = false,
}) => {
  return (
    <div className="search-container">
      <label htmlFor="notes-search-input" className="sr-only">
        Search notes by title or content
      </label>
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          id="notes-search-input"
          type="search"
          className="search-input"
          placeholder="Search your notes by title or content..."
          value={value}
          maxLength={100}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          data-testid="notes-search-input"
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={onClear}
            aria-label="Clear search query"
            data-testid="notes-search-clear"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
