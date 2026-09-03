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
          • List
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
          1. List
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
          🔗 Link
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
            ✕ Unlink
          </button>
        )}
      </div>
    </div>
  );
};
