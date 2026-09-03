import { useAuth } from '../context/AuthContext';

export const DashboardPlaceholderPage = () => {
  const { user } = useAuth();

  return (
    <main className="main-content" data-testid="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-emoji" aria-hidden="true">
          🎉
        </div>
        <h1>Welcome, {user?.name || 'User'}!</h1>
        <p>
          Your authentication session is active and verified for <strong>{user?.email}</strong>.
        </p>
        <div className="dashboard-info-box">
          <strong>PR #5 Scope Complete:</strong> Web shell, session restoration via{' '}
          <code>GET /auth/me</code>, and route guards verified. Notes management and rich-text
          editing arrive in PR #6.
        </div>
      </div>
    </main>
  );
};
