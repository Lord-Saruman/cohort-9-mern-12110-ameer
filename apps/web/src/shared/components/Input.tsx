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
          {error}
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
