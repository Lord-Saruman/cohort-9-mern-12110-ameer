import type { ReactNode } from 'react';

export interface AlertProps {
  variant?: 'danger' | 'success';
  children: ReactNode;
  id?: string;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

export const Alert = ({
  variant = 'danger',
  children,
  id,
  role,
  'aria-live': ariaLive,
}: AlertProps) => {
  const effectiveRole = role ?? (variant === 'success' ? 'status' : 'alert');
  const effectiveLive = ariaLive ?? (variant === 'success' ? 'polite' : 'assertive');

  return (
    <div
      id={id}
      className={`alert alert-${variant}`}
      role={effectiveRole}
      aria-live={effectiveLive}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '1px' }} aria-hidden="true">
        {variant === 'success' ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
};
