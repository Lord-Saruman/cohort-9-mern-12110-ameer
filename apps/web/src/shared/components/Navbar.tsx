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

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <Link to="/" className="navbar-brand">
        <span aria-hidden="true">📝</span>
        <span>Notes App</span>
      </Link>

      <div className="navbar-user">
        {isAuthenticated && user ? (
          <>
            <span className="user-name" data-testid="user-greeting">
              Signed in as <strong>{user.name}</strong>
            </span>
            <Button
              variant="secondary"
              isLoading={isLoggingOut}
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              data-testid="logout-button"
            >
              Sign Out
            </Button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
