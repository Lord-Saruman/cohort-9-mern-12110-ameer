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

    // Default 404
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

    // Shows loading initially
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

    // After session is restored, shows dashboard and user greeting
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
    // Short password (<12 chars)
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

    // Button should be disabled during submission
    expect(submitBtn).toBeDisabled();

    // Resolve login request
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
});
