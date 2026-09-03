import { LoginForm } from '../components/LoginForm';

export const LoginPage = () => {
  return (
    <main className="main-content">
      <div className="auth-container">
        <header className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account to access your private notes.</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
};
