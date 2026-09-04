import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = ({ id, label, error, helperText, className = '', ...props }: InputProps) => {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const ariaDescribedBy = [error ? errorId : undefined, helperText ? helperId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <input
        id={id}
        className={`form-input ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={ariaDescribedBy || undefined}
        {...props}
      />
      {error && (
        <div id={errorId} className="field-error" role="alert">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      {!error && helperText && (
        <div id={helperId} className="checklist-title">
          {helperText}
        </div>
      )}
    </div>
  );
};
