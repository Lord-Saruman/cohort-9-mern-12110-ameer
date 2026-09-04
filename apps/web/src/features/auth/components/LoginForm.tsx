import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../../shared/api/client';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { getSafeRedirectPath } from '../../../shared/utils/routing';
import { useAuth } from '../context/AuthContext';

export const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length > 72) {
      errors.password = 'Password must not exceed 72 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      const safeTarget = getSafeRedirectPath(
        (location.state as { from?: unknown } | undefined)?.from,
        '/dashboard',
      );
      navigate(safeTarget, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.details && err.details.length > 0) {
          const mapped: Record<string, string> = {};
          const unmapped: string[] = [];
          for (const item of err.details) {
            if (item.field === 'email' || item.field === 'password') {
              mapped[item.field] = item.message;
            } else {
              unmapped.push(item.message);
            }
          }
          setFieldErrors(mapped);
          if (unmapped.length > 0) {
            setFormError(unmapped.join(' '));
          }
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <Alert variant="danger" id="login-form-error">
          {formError}
        </Alert>
      )}

      <Input
        id="login-email"
        label="Email Address"
        type="email"
        autoComplete="email"
        maxLength={254}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldErrors.email) {
            setFieldErrors((prev) => ({ ...prev, email: '' }));
          }
        }}
        error={fieldErrors.email}
        disabled={isSubmitting}
        required
      />

      <Input
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        maxLength={72}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: '' }));
          }
        }}
        error={fieldErrors.password}
        disabled={isSubmitting}
        required
      />

      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
        style={{ marginTop: '0.5rem' }}
        data-testid="login-submit-button"
      >
        Sign In
      </Button>

      <div className="auth-footer">
        Don&apos;t have an account? <Link to="/register">Create an account</Link>
      </div>
    </form>
  );
};
