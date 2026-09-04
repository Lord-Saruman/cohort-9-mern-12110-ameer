import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../../shared/api/client';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { useAuth } from '../context/AuthContext';

export const RegisterForm = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password rules evaluation
  const passwordCriteria = useMemo(() => {
    return {
      minLength: password.length >= 12,
      maxLength: password.length <= 72,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasDigit: /\d/.test(password),
    };
  }, [password]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name must not exceed 100 characters.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    } else if (trimmedEmail.length > 254) {
      errors.email = 'Email address must not exceed 254 characters.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (!passwordCriteria.minLength) {
      errors.password = 'Password must be at least 12 characters.';
    } else if (!passwordCriteria.maxLength) {
      errors.password = 'Password must not exceed 72 characters.';
    } else if (
      !passwordCriteria.hasUpper ||
      !passwordCriteria.hasLower ||
      !passwordCriteria.hasDigit
    ) {
      errors.password = 'Password must contain uppercase, lowercase, and numeric characters.';
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
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.code === 'CONFLICT') {
          setFormError('An account with this email address already exists.');
        } else if (err.details && err.details.length > 0) {
          const mapped: Record<string, string> = {};
          const unmapped: string[] = [];
          for (const item of err.details) {
            if (item.field === 'name' || item.field === 'email' || item.field === 'password') {
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
        <Alert variant="danger" id="register-form-error">
          {formError}
        </Alert>
      )}

      <Input
        id="register-name"
        label="Full Name"
        type="text"
        autoComplete="name"
        maxLength={100}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (fieldErrors.name) {
            setFieldErrors((prev) => ({ ...prev, name: '' }));
          }
        }}
        error={fieldErrors.name}
        disabled={isSubmitting}
        required
      />

      <Input
        id="register-email"
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
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
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

      <div className="password-checklist" aria-label="Security requirements" aria-live="polite">
        <div className="checklist-title">Password must include:</div>
        <div
          className={`checklist-item ${
            passwordCriteria.minLength && passwordCriteria.maxLength ? 'valid' : 'invalid'
          }`}
        >
          <span className="check-icon">
            {passwordCriteria.minLength && passwordCriteria.maxLength ? '✓' : '○'}
          </span>
          <span>Between 12 and 72 characters</span>
        </div>
        <div className={`checklist-item ${passwordCriteria.hasUpper ? 'valid' : 'invalid'}`}>
          <span className="check-icon">{passwordCriteria.hasUpper ? '✓' : '○'}</span>
          <span>At least one uppercase letter (A-Z)</span>
        </div>
        <div className={`checklist-item ${passwordCriteria.hasLower ? 'valid' : 'invalid'}`}>
          <span className="check-icon">{passwordCriteria.hasLower ? '✓' : '○'}</span>
          <span>At least one lowercase letter (a-z)</span>
        </div>
        <div className={`checklist-item ${passwordCriteria.hasDigit ? 'valid' : 'invalid'}`}>
          <span className="check-icon">{passwordCriteria.hasDigit ? '✓' : '○'}</span>
          <span>At least one number (0-9)</span>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
        style={{ marginTop: '0.5rem' }}
        data-testid="register-submit-button"
      >
        Create Account
      </Button>

      <div className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </form>
  );
};
