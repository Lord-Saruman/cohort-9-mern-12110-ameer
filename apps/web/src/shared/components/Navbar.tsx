import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { Button } from './Button';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <Link to="/" className="navbar-brand">
        <span>📝</span>
        <span>Notes App</span>
      </Link>

      <div className="navbar-user">
        {isAuthenticated && user ? (
          <>
            <span className="user-name" data-testid="user-greeting">
              Signed in as <strong>{user.name}</strong>
            </span>
            <Button variant="secondary" onClick={() => void logout()} data-testid="logout-button">
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
