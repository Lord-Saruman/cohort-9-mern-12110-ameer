import { LoginForm } from '../components/LoginForm';

export const LoginPage = () => {
  return (
    <main className="main-content">
      <div className="auth-container">
        <header className="auth-header">
          <div
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}
            aria-hidden="true"
          >
            <div
              className="brand-icon-wrapper"
              style={{ width: '48px', height: '48px', borderRadius: '14px' }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: '26px', height: '26px' }}
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 12h6" />
                <path d="M9 16h4" />
              </svg>
            </div>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your account to access your private notes.</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
};
