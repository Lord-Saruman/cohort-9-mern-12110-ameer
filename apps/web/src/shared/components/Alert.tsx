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
      {children}
    </div>
  );
};
