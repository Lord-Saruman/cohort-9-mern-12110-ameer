import type { ReactNode } from 'react';

export interface AlertProps {
  variant?: 'danger' | 'success';
  children: ReactNode;
  id?: string;
}

export const Alert = ({ variant = 'danger', children, id }: AlertProps) => {
  return (
    <div id={id} className={`alert alert-${variant}`} role="alert">
      {children}
    </div>
  );
};
