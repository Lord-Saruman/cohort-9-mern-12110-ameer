import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../src/app/App';
import type { NoteDto } from '../src/features/notes/api/notes.types';
import type { UserDto } from '../src/shared/api/types';

const mockUser: UserDto = {
  id: 'user-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const mockExistingNote: NoteDto = {
  id: 'note-uuid-1',
  title: 'Project Roadmap',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Q3 Objectives' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Deliver web application shell and editor.' }],
      },
    ],
  },
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

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

describe('Rich Text Note Editor Feature', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.pushState({}, '', '/');
  });

  it('renders create note view with title input, character counter, and editor toolbar', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState({}, '', '/notes/new');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('note-editor-page')).toBeInTheDocument();
    });

    expect(screen.getByText('New Note')).toBeInTheDocument();
    expect(screen.getByTestId('note-title-counter')).toHaveTextContent('0/200');
    expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-h1')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-bold')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-italic')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-bullet-list')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-link')).toBeInTheDocument();
    expect(screen.getByTestId('save-note-button')).toBeDisabled();
  });

  it('creates a new note and navigates to the newly created note route', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'POST /api/v1/notes': {
        status: 201,
        body: {
          data: mockExistingNote,
        },
      },
      'GET /api/v1/notes/note-uuid-1': {
        status: 200,
        body: {
          data: mockExistingNote,
        },
      },
    });

    window.history.pushState({}, '', '/notes/new');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('note-editor-page')).toBeInTheDocument();
    });

    const titleInput = screen.getByTestId('note-title-input');
    await user.type(titleInput, 'Project Roadmap');

    expect(screen.getByTestId('note-title-counter')).toHaveTextContent('15/200');
    expect(screen.getByTestId('save-note-button')).not.toBeDisabled();

    await user.click(screen.getByTestId('save-note-button'));

    await waitFor(() => {
      expect(screen.getByText('Editing Note')).toBeInTheDocument();
    });

    expect(screen.getByTestId('delete-note-button')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Project Roadmap')).toBeInTheDocument();
  });

  it('loads existing note details, updates title, and saves changes', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes/note-uuid-1': {
        status: 200,
        body: {
          data: mockExistingNote,
        },
      },
      'PATCH /api/v1/notes/note-uuid-1': {
        status: 200,
        body: {
          data: {
            ...mockExistingNote,
            title: 'Updated Project Roadmap',
          },
        },
      },
    });

    window.history.pushState({}, '', '/notes/note-uuid-1');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Project Roadmap')).toBeInTheDocument();
    });

    expect(screen.getByText('Editing Note')).toBeInTheDocument();
    expect(screen.getByTestId('delete-note-button')).toBeInTheDocument();

    const titleInput = screen.getByTestId('note-title-input');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Project Roadmap');

    await user.click(screen.getByTestId('save-note-button'));

    await waitFor(() => {
      expect(screen.getByText('Note saved successfully!')).toBeInTheDocument();
    });
  });

  it('handles delete confirmation modal cancel and confirm flows with Escape key and redirect', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes/note-uuid-1': {
        status: 200,
        body: {
          data: mockExistingNote,
        },
      },
      'DELETE /api/v1/notes/note-uuid-1': {
        status: 204,
        body: null,
      },
      'GET /api/v1/notes': {
        status: 200,
        body: {
          data: [],
          meta: { page: 1, pageSize: 20, total: 0 },
        },
      },
    });

    window.history.pushState({}, '', '/notes/note-uuid-1');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Project Roadmap')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('delete-note-button'));

    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('delete-note-button'));
    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('cancel-delete-button'));
    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('delete-note-button'));
    await user.click(screen.getByTestId('confirm-delete-button'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('handles 404 / cross-user note access cleanly with return to dashboard link', async () => {
    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes/unauthorized-note-id': {
        status: 404,
        body: {
          error: {
            code: 'NOT_FOUND',
            message: 'Note not found.',
          },
        },
      },
    });

    window.history.pushState({}, '', '/notes/unauthorized-note-id');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('note-not-found')).toBeInTheDocument();
    });

    expect(screen.getByText('Note Not Found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The note you requested does not exist or you do not have permission to view it.',
      ),
    ).toBeInTheDocument();
  });

  it('toggles formatting marks and validates link insertion in toolbar', async () => {
    const user = userEvent.setup();

    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('https://example.com');
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState({}, '', '/notes/new');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('toolbar-bold'));
    await user.click(screen.getByTestId('toolbar-italic'));
    await user.click(screen.getByTestId('toolbar-h1'));
    await user.click(screen.getByTestId('toolbar-h2'));
    await user.click(screen.getByTestId('toolbar-h3'));
    await user.click(screen.getByTestId('toolbar-bullet-list'));
    await user.click(screen.getByTestId('toolbar-ordered-list'));

    await user.click(screen.getByTestId('toolbar-link'));
    expect(promptSpy).toHaveBeenCalled();

    promptSpy.mockReturnValueOnce(null as unknown as string);
    await user.click(screen.getByTestId('toolbar-link'));

    promptSpy.mockReturnValueOnce('');
    await user.click(screen.getByTestId('toolbar-link'));

    promptSpy.mockReturnValueOnce('javascript:alert(1)');
    await user.click(screen.getByTestId('toolbar-link'));
    expect(alertSpy).toHaveBeenCalledWith('Invalid URL. Links must start with http:// or https://');

    promptSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('validates title constraints and displays error alert for invalid titles', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
    });

    window.history.pushState({}, '', '/notes/new');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('note-editor-page')).toBeInTheDocument();
    });

    const titleInput = screen.getByTestId('note-title-input');
    const saveButton = screen.getByTestId('save-note-button');

    await user.type(titleInput, '    ');
    expect(saveButton).toBeDisabled();

    await user.clear(titleInput);
    await user.type(titleInput, 'Valid Title');
    expect(saveButton).not.toBeDisabled();

    await user.click(screen.getByTestId('back-to-dashboard'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('handles backdrop click and focus trap navigation in delete modal', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes/note-uuid-1': {
        status: 200,
        body: {
          data: mockExistingNote,
        },
      },
    });

    window.history.pushState({}, '', '/notes/note-uuid-1');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-note-button')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('delete-note-button'));
    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();

    const cancelButton = screen.getByTestId('cancel-delete-button');
    const confirmButton = screen.getByTestId('confirm-delete-button');

    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();

    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);
    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
  });
});
