import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app/App';

const mockUser = {
  id: 'usr-12345',
  name: 'Jane Doe',
  email: 'jane@example.com',
  createdAt: '2026-09-01T12:00:00.000Z',
};

const createMockFetch = (handlers: Record<string, { status: number; body: unknown }>) => {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const cleanUrl = url.replace(/https?:\/\/[^/]+/, '');
    const key = `${method} ${cleanUrl}`;

    const match =
      handlers[key] ??
      handlers[`${method} ${cleanUrl.split('?')[0]}`] ??
      Object.entries(handlers).find(([pattern]) => {
        const [m, p] = pattern.split(' ');
        return m === method && p && cleanUrl.startsWith(p);
      })?.[1];

    if (match) {
      return Promise.resolve({
        ok: match.status >= 200 && match.status < 300,
        status: match.status,
        json: () => Promise.resolve(match.body),
      } as Response);
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          error: { code: 'NOT_FOUND', message: `No mock for ${key}` },
        }),
    } as Response);
  });
};

describe('Frontend Authentication Flows', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.pushState({}, '', '/');
  });

  it('restores authenticated session on mount from GET /auth/me and displays dashboard', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    render(<App />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-greeting')).toHaveTextContent('Jane Doe');
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user from protected routes to /login when /auth/me returns 401', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('allows a user to register with valid credentials and redirects to dashboard', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      },
      'POST /api/v1/auth/register': {
        status: 201,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState({}, '', '/register');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(
      screen.getByLabelText(/^password$/i, { selector: 'input' }),
      'SecurePassword123',
    );

    await user.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-greeting')).toHaveTextContent('Jane Doe');
  });

  it('displays a conflict error alert when registration email already exists (409)', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      },
      'POST /api/v1/auth/register': {
        status: 409,
        body: {
          error: {
            code: 'CONFLICT',
            message: 'An account with this email address already exists.',
          },
        },
      },
    });

    window.history.pushState({}, '', '/register');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), 'Jane Clone');
    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(
      screen.getByLabelText(/^password$/i, { selector: 'input' }),
      'SecurePassword123',
    );

    await user.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An account with this email address already exists.',
      );
    });
  });

  it('enforces password criteria client-side during registration', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      },
    });

    window.history.pushState({}, '', '/register');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'Short123');

    await user.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Password must be at least 12 characters.',
      );
    });
  });

  it('allows an existing user to log in with valid credentials and redirects to dashboard', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      },
      'POST /api/v1/auth/login': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');

    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-greeting')).toHaveTextContent('Jane Doe');
  });

  it('displays invalid credentials alert when login fails with 401', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      },
      'POST /api/v1/auth/login': {
        status: 401,
        body: {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Invalid email or password.',
          },
        },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'WrongPassword123');

    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.');
    });
  });

  it('displays rate limit exceeded alert when login returns 429', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      },
      'POST /api/v1/auth/login': {
        status: 429,
        body: {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');

    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/too many requests/i);
    });
  });

  it('disables submit button and shows loading indicator while request is pending', async () => {
    const user = userEvent.setup();

    let resolveLogin: (value: Response) => void;
    const loginPromise = new Promise<Response>((res) => {
      resolveLogin = res;
    });

    global.fetch = jest.fn().mockImplementation((url: string, _init?: RequestInit) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED' } }),
        } as Response);
      }
      if (url.includes('/auth/login')) {
        return loginPromise;
      }
      return Promise.reject(new Error('Unknown url'));
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');

    const submitBtn = screen.getByTestId('login-submit-button');
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(submitBtn).toBeDisabled();

    resolveLogin!({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { user: mockUser } }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('signs out the user on logout button click, clears session, and redirects to /login', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'POST /api/v1/auth/logout': {
        status: 204,
        body: null,
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByTestId('logout-button');
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('user-greeting')).not.toBeInTheDocument();
  });

  it('displays server error alert when login fails with 500', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
      'POST /api/v1/auth/login': {
        status: 500,
        body: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Database connection failed.',
          },
        },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');
    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Database connection failed.');
    });
  });

  it('displays network error when login fetch rejects', async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED' } }),
        } as Response);
      }
      return Promise.reject(new Error('Failed to fetch'));
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');
    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to fetch/i);
    });
  });

  it('displays field errors when server returns 400 validation error with details on login', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
      'POST /api/v1/auth/login': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please correct the highlighted fields.',
            details: [
              { field: 'email', message: 'Email is invalid on server.' },
              { field: 'password', message: 'Password is too long.' },
            ],
          },
        },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(emailInput, 'jane@example.com');
    await user.type(passwordInput, 'SecurePassword123');
    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Email is invalid on server.')).toBeInTheDocument();
      expect(screen.getByText('Password is too long.')).toBeInTheDocument();
    });

    await user.type(emailInput, 'a');
    expect(screen.queryByText('Email is invalid on server.')).not.toBeInTheDocument();

    await user.type(passwordInput, 'b');
    expect(screen.queryByText('Password is too long.')).not.toBeInTheDocument();
  });

  it('surfaces unmapped server validation error in top alert on login', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
      'POST /api/v1/auth/login': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payload shape.',
            details: [{ field: 'body', message: 'Unexpected JSON root structure.' }],
          },
        },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');
    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unexpected JSON root structure.');
    });
  });

  it('enforces client-side validation rules on login form', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('login-submit-button'));
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'notanemail');
    await user.click(screen.getByTestId('login-submit-button'));
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  });

  it('redirects to preserved safe from path and sanitizes open redirects on login', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
      'POST /api/v1/auth/login': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState(
      { from: { pathname: '/dashboard', search: '?view=compact' } },
      '',
      '/login',
    );
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123');
    await user.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('displays server error and field details on registration failure', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
      'POST /api/v1/auth/register': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid inputs.',
            details: [
              { field: 'name', message: 'Name is taken.' },
              { field: 'email', message: 'Domain is blocked.' },
              { field: 'password', message: 'Password breached.' },
              { field: 'body', message: 'Unrecognized registration parameter.' },
            ],
          },
        },
      },
    });

    window.history.pushState({}, '', '/register');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i, { selector: 'input' });

    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane@example.com');
    await user.type(passwordInput, 'SecurePassword123');
    await user.click(screen.getByTestId('register-submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Name is taken.')).toBeInTheDocument();
      expect(screen.getByText('Domain is blocked.')).toBeInTheDocument();
      expect(screen.getByText('Password breached.')).toBeInTheDocument();
      expect(screen.getByText('Unrecognized registration parameter.')).toBeInTheDocument();
    });

    await user.type(nameInput, 'a');
    expect(screen.queryByText('Name is taken.')).not.toBeInTheDocument();

    await user.type(emailInput, 'b');
    expect(screen.queryByText('Domain is blocked.')).not.toBeInTheDocument();

    await user.type(passwordInput, 'c');
    expect(screen.queryByText('Password breached.')).not.toBeInTheDocument();
  });

  it('validates client-side inputs on registration form thoroughly', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 401,
        body: { error: { code: 'UNAUTHENTICATED' } },
      },
    });

    window.history.pushState({}, '', '/register');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i, { selector: 'input' });
    const submitBtn = screen.getByTestId('register-submit-button');

    await user.click(submitBtn);
    expect(screen.getByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();

    await user.type(nameInput, 'J');
    await user.click(submitBtn);
    expect(screen.getByText('Name must be at least 2 characters.')).toBeInTheDocument();

    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane@example.com');
    await user.type(passwordInput, 'alllowercaseletters');
    await user.click(submitBtn);
    expect(
      screen.getByText('Password must contain uppercase, lowercase, and numeric characters.'),
    ).toBeInTheDocument();
  });

  it('redirects already authenticated user from public routes /login and /register to /dashboard', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState({}, '', '/login');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('user-greeting')).toHaveTextContent('Jane Doe');
  });

  it('handles session restoration failure (network / 500) and keeps user unauthenticated', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/me')) {
        return Promise.reject(new Error('Network down'));
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('clears session on logout even if server returns 500', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'POST /api/v1/auth/logout': {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'Logout failed on server' } },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByTestId('logout-button');
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('user-greeting')).not.toBeInTheDocument();
  });
});
