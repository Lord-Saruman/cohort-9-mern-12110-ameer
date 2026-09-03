import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../src/app/App';
import type { NoteDto } from '../src/features/notes/api/notes.types';
import { Alert } from '../src/shared/components/Alert';
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
        type: 'paragraph',
        content: [{ type: 'text', text: 'Deliver accessibility proofs.' }],
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

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          error: { code: 'NOT_FOUND', message: `No mock for ${exactKey}` },
        }),
    } as Response);
  });
};

describe('End-to-End Accessibility and Live Region Hardening', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.pushState({}, '', '/');
  });

  it('renders success alert with role="status" and polite live region', () => {
    render(<Alert variant="success">Note updated successfully.</Alert>);

    const alertElement = screen.getByRole('status');
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveAttribute('aria-live', 'polite');
    expect(alertElement).toHaveTextContent('Note updated successfully.');
  });

  it('renders danger alert with role="alert" and assertive live region', () => {
    render(<Alert variant="danger">Invalid payload provided.</Alert>);

    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveAttribute('aria-live', 'assertive');
    expect(alertElement).toHaveTextContent('Invalid payload provided.');
  });

  it('announces live feedback politely when saving a note on NoteEditorPage', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes/note-uuid-1': {
        status: 200,
        body: { data: mockExistingNote },
      },
      'PATCH /api/v1/notes/note-uuid-1': {
        status: 200,
        body: { data: { ...mockExistingNote, title: 'Updated Roadmap' } },
      },
    });

    window.history.pushState({}, '', '/notes/note-uuid-1');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('save-note-button')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/note title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Roadmap');

    await user.click(screen.getByTestId('save-note-button'));

    await waitFor(() => {
      const liveAlert = screen.getByRole('status');
      expect(liveAlert).toHaveAttribute('aria-live', 'polite');
      expect(liveAlert).toHaveTextContent('Note saved successfully!');
    });
  });

  it('assertively announces validation failures when saving fails on server', async () => {
    const user = userEvent.setup();

    global.fetch = createMockFetch({
      'GET /api/v1/auth/me': {
        status: 200,
        body: { data: { user: mockUser } },
      },
      'GET /api/v1/notes/note-uuid-1': {
        status: 200,
        body: { data: mockExistingNote },
      },
      'PATCH /api/v1/notes/note-uuid-1': {
        status: 400,
        body: {
          error: { code: 'VALIDATION_ERROR', message: 'Title exceeds server limit.' },
        },
      },
    });

    window.history.pushState({}, '', '/notes/note-uuid-1');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('save-note-button')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('save-note-button'));

    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(errorAlert).toHaveTextContent('Title exceeds server limit.');
    });
  });
});
