'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import clsx from 'clsx';

interface DiaryEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

export function DiaryEditor({ content, onChange, className }: DiaryEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[150px] p-3 text-white/80',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={clsx('space-y-2', className)}>
      <label className="block text-sm font-medium text-white/70">
        Diary Entry
      </label>
      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
        {/* Toolbar */}
        <div className="bg-white/[0.02] border-b border-white/10 p-2 flex gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium transition-colors',
              editor.isActive('bold')
                ? 'bg-purple-600 text-white'
                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.04] hover:text-white'
            )}
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium italic transition-colors',
              editor.isActive('italic')
                ? 'bg-purple-600 text-white'
                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.04] hover:text-white'
            )}
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium line-through transition-colors',
              editor.isActive('strike')
                ? 'bg-purple-600 text-white'
                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.04] hover:text-white'
            )}
            title="Strikethrough"
          >
            S
          </button>
          <div className="w-px bg-white/10 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium transition-colors',
              editor.isActive('bulletList')
                ? 'bg-purple-600 text-white'
                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.04] hover:text-white'
            )}
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium transition-colors',
              editor.isActive('orderedList')
                ? 'bg-purple-600 text-white'
                : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.04] hover:text-white'
            )}
            title="Numbered List"
          >
            1.
          </button>
        </div>
        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
