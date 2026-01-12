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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={clsx('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700">
        Diary Entry
      </label>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium transition-colors',
              editor.isActive('bold')
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
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
                : 'bg-white text-gray-700 hover:bg-gray-100'
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
                : 'bg-white text-gray-700 hover:bg-gray-100'
            )}
            title="Strikethrough"
          >
            S
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium transition-colors',
              editor.isActive('bulletList')
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
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
                : 'bg-white text-gray-700 hover:bg-gray-100'
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
