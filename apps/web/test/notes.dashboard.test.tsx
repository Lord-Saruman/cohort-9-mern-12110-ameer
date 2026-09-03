import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../src/app/App';
import type { NoteSummaryDto } from '../src/features/notes/api/notes.types';
import type { UserDto } from '../src/shared/api/types';

const mockUser: UserDto = {
  id: 'user-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const mockNotesList: NoteSummaryDto[] = [
  {
    id: 'note-1',
    title: 'Architecture Review',
    preview: 'Meeting discussion regarding scalable microservices.',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-02T14:30:00.000Z',
  },
  {
    id: 'note-2',
    title: 'Grocery List',
    preview: 'Apples, milk, bread, and dark roast coffee.',
    createdAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T08:00:00.000Z',
  },
];

const createMockFetch = (handlers: Record<string, { status: number; body: unknown }>) => {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const cleanUrl = url.replace(/https?:\/\/[^/]+/, '');

    const exactKey = `${method} ${cleanUrl}`;
    if (handlers[exactKey]) {
      const match = handlers[exactKey];
      return Promise.resolve({
        ok: match.status >= 200 && match.status < 300,
        status: match.status,
        json: () => Promise.resolve(match.body),
      } as Response);
    }

    const sortedHandlers = Object.entries(handlers).sort(([a], [b]) => b.length - a.length);

    for (const [pattern, handler] of sortedHandlers) {
      const [m, p] = pattern.split(' ');
      if (m === method && p) {
        if (p.includes('?')) {
          const [path, query] = p.split('?');
          const [urlPath, urlQuery] = cleanUrl.split('?');
          if (path === urlPath && query && urlQuery?.includes(query)) {
            return Promise.resolve({
              ok: handler.status >= 200 && handler.status < 300,
              status: handler.status,
              json: () => Promise.resolve(handler.body),
            } as Response);
          }
        } else if (cleanUrl.split('?')[0] === p) {
          return Promise.resolve({
            ok: handler.status >= 200 && handler.status < 300,
            status: handler.status,
            json: () => Promise.resolve(handler.body),
          } as Response);
        }
      }
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
    } as Response);
  });
};

describe('Notes Dashboard Feature', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.pushState({}, '', '/');
  });

  it('renders populated note list with note cards, title, and preview', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: mockNotesList,
          meta: { page: 1, pageSize: 20, total: 2 },
        },
      },
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });

    expect(screen.getByText('Grocery List')).toBeInTheDocument();
    expect(
      screen.getByText('Meeting discussion regarding scalable microservices.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument();
    expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument();
  });

  it('renders empty state when user has no notes and provides CTA to create', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: [],
          meta: { page: 1, pageSize: 20, total: 0 },
        },
      },
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('notes-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('No notes yet')).toBeInTheDocument();
    expect(screen.getByTestId('empty-create-note-button')).toHaveAttribute('href', '/notes/new');
  });

  it('handles search input, debouncing, and clearing search query', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: mockNotesList,
          meta: { page: 1, pageSize: 20, total: 2 },
        },
      },
      'GET /api/v1/notes?q=Groceries': {
        status: 200,
        body: {
          data: [mockNotesList[1]],
          meta: { page: 1, pageSize: 20, total: 1 },
        },
      },
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('notes-search-input');
    await user.type(searchInput, 'Groceries');

    await waitFor(() => {
      expect(screen.getByText('Grocery List')).toBeInTheDocument();
    });

    const clearBtn = screen.getByTestId('notes-search-clear');
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });
  });

  it('displays empty search results state with clear search button', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: mockNotesList,
          meta: { page: 1, pageSize: 20, total: 2 },
        },
      },
      'GET /api/v1/notes?q=NonExistent': {
        status: 200,
        body: {
          data: [],
          meta: { page: 1, pageSize: 20, total: 0 },
        },
      },
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('notes-search-input');
    await user.type(searchInput, 'NonExistent');

    await waitFor(() => {
      expect(screen.getByText('No matching notes found')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/we couldn't find any notes matching "NonExistent"/i),
    ).toBeInTheDocument();

    const clearBtn = screen.getByTestId('clear-search-button');
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });
  });

  it('supports pagination controls navigation and boundary states', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: [mockNotesList[0]],
          meta: { page: 1, pageSize: 1, total: 2 },
        },
      },
      'GET /api/v1/notes?page=2': {
        status: 200,
        body: {
          data: [mockNotesList[1]],
          meta: { page: 2, pageSize: 1, total: 2 },
        },
      },
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Page 1 of 2 (2 notes)');
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();

    await user.click(screen.getByTestId('pagination-next'));

    await waitFor(() => {
      expect(screen.getByText('Grocery List')).toBeInTheDocument();
    });

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Page 2 of 2 (2 notes)');
    expect(screen.getByTestId('pagination-prev')).not.toBeDisabled();
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
  });

  it('displays error banner on API failure and retries successfully', async () => {
    const user = userEvent.setup();

    let attempts = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { user: mockUser } }),
        } as Response);
      }

      attempts++;
      if (attempts === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              error: { code: 'INTERNAL_ERROR', message: 'Database connection timed out.' },
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: mockNotesList,
            meta: { page: 1, pageSize: 20, total: 2 },
          }),
      } as Response);
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('notes-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Database connection timed out.')).toBeInTheDocument();

    const retryBtn = screen.getByTestId('retry-button');
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });
  });

  it('navigates to note editor when note card or create note button is clicked', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: mockNotesList,
          meta: { page: 1, pageSize: 20, total: 2 },
        },
      },
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Review')).toBeInTheDocument();
    });

    const noteCard = screen.getByTestId('note-card-note-1');
    expect(noteCard).toHaveAttribute('href', '/notes/note-1');

    const createBtn = screen.getByTestId('create-note-button');
    expect(createBtn).toHaveAttribute('href', '/notes/new');
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId('note-editor-page')).toBeInTheDocument();
    });
  });
});
