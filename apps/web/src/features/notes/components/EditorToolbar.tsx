import type { Editor } from '@tiptap/react';
import type { FC } from 'react';

export interface EditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

export const EditorToolbar: FC<EditorToolbarProps> = ({ editor, disabled = false }) => {
  if (!editor) return null;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter link URL (must start with http:// or https://):', previousUrl);

    if (url === null) return;

    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      window.alert('Invalid URL. Links must start with http:// or https://');
      return;
    }

    editor.chain().focus().setLink({ href: trimmedUrl }).run();
  };

  return (
    <div
      className="editor-toolbar"
      role="toolbar"
      aria-label="Formatting options"
      data-testid="editor-toolbar"
    >
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          aria-label="Heading 1"
          aria-pressed={editor.isActive('heading', { level: 1 })}
          data-testid="toolbar-h1"
        >
          H1
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          aria-label="Heading 2"
          aria-pressed={editor.isActive('heading', { level: 2 })}
          data-testid="toolbar-h2"
        >
          H2
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          aria-label="Heading 3"
          aria-pressed={editor.isActive('heading', { level: 3 })}
          data-testid="toolbar-h3"
        >
          H3
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-label="Bold text"
          aria-pressed={editor.isActive('bold')}
          data-testid="toolbar-bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-label="Italic text"
          aria-pressed={editor.isActive('italic')}
          data-testid="toolbar-italic"
        >
          <em>I</em>
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-label="Bullet list"
          aria-pressed={editor.isActive('bulletList')}
          data-testid="toolbar-bullet-list"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
          </svg>
          <span>List</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          aria-label="Numbered list"
          aria-pressed={editor.isActive('orderedList')}
          data-testid="toolbar-ordered-list"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
          <span>Numbered</span>
        </button>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
          onClick={handleSetLink}
          disabled={disabled}
          aria-label="Add or edit link"
          aria-pressed={editor.isActive('link')}
          data-testid="toolbar-link"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Link</span>
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={disabled}
            aria-label="Remove link"
            data-testid="toolbar-unlink"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Unlink</span>
          </button>
        )}
      </div>
    </div>
  );
};
