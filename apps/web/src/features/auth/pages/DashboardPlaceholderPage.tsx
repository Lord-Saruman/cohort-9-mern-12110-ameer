import { useAuth } from '../context/AuthContext';

export const DashboardPlaceholderPage = () => {
  const { user } = useAuth();

  return (
    <main className="main-content" data-testid="dashboard-page">
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          maxWidth: '640px',
          margin: '2rem auto',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
          Welcome, {user?.name || 'User'}!
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Your authentication session is active and verified for <strong>{user?.email}</strong>.
        </p>
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            fontSize: '0.875rem',
            color: '#93c5fd',
          }}
        >
          <strong>PR #5 Scope Complete:</strong> Web shell, session restoration via{' '}
          <code>GET /auth/me</code>, and route guards verified. Notes management and rich-text
          editing arrive in PR #6.
        </div>
      </div>
    </main>
  );
};
