export interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner = ({ size = 20, className = '' }: SpinnerProps) => (
  <svg
    className={`spinner ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="status"
    aria-label="Loading"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="31.4 31.4"
      strokeLinecap="round"
      opacity="0.25"
    />
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeDasharray="15.7 47.1"
      strokeLinecap="round"
    />
  </svg>
);
