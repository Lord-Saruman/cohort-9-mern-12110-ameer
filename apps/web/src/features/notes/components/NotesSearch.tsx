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
          🔍
        </span>
        <input
          id="notes-search-input"
          type="search"
          className="search-input"
          placeholder="Search notes..."
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
