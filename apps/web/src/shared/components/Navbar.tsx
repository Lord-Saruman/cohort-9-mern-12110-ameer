import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { Button } from './Button';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <Link to="/" className="navbar-brand">
        <div className="brand-icon-wrapper" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </svg>
        </div>
        <span>Notes App</span>
      </Link>

      <div className="navbar-user">
        {isAuthenticated && user ? (
          <>
            <div className="user-profile-badge">
              <div className="user-avatar" aria-hidden="true">
                {userInitial}
              </div>
              <span className="user-name" data-testid="user-greeting">
                Signed in as <strong>{user.name}</strong>
              </span>
            </div>
            <Button
              variant="secondary"
              className="btn-sm"
              isLoading={isLoggingOut}
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              data-testid="logout-button"
            >
              Sign Out
            </Button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
