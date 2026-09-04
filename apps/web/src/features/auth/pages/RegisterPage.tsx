import { RegisterForm } from '../components/RegisterForm';

export const RegisterPage = () => {
  return (
    <main className="main-content">
      <div className="auth-container">
        <header className="auth-header">
          <h1>Create Account</h1>
          <p>Sign up to start capturing and organizing your private notes.</p>
        </header>
        <RegisterForm />
      </div>
    </main>
  );
};
