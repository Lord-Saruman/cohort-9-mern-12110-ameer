import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState, type FC } from 'react';

import type { TipTapDoc } from '../api/notes.types';
import { EditorToolbar } from './EditorToolbar';

export interface RichTextEditorProps {
  content: TipTapDoc;
  onChange: (doc: TipTapDoc) => void;
  editable?: boolean;
}

export const RichTextEditor: FC<RichTextEditorProps> = ({ content, onChange, editable = true }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [, setSelectionTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
        validate: (href) => /^https?:\/\//i.test(href),
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor: currentEditor }) => {
      const json = currentEditor.getJSON() as TipTapDoc;
      onChangeRef.current(json);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      setSelectionTick((prev) => (prev + 1) % 10000);
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content, false);
      }
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="rich-editor-wrapper" data-testid="rich-text-editor">
      <EditorToolbar editor={editor} disabled={!editable} />
      <div className="editor-content-area" aria-label="Rich text editor content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
