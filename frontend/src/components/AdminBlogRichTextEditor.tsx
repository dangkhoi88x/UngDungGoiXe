import { useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import type { Editor } from '@tiptap/core'
import './AdminBlogRichTextEditor.css'

export type AdminBlogRichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

function isSameHtml(a: string, b: string): boolean {
  return (a || '').trim() === (b || '').trim()
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const setLink = useCallback(() => {
    if (!editor || disabled) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Dán URL liên kết (để trống để gỡ link)', prev ?? 'https://')
    if (url === null) return
    const t = url.trim()
    if (t === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: t }).run()
  }, [editor, disabled])

  if (!editor) {
    return (
      <div className="adm-blog-rte__toolbar adm-blog-rte__toolbar--ghost" aria-hidden>
        <span className="adm-blog-rte__toolbar-placeholder">Đang mở trình soạn…</span>
      </div>
    )
  }

  const btn = (label: string, active: boolean, onPress: () => void, title: string) => (
    <button
      type="button"
      className={`adm-blog-rte__btn${active ? ' is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (!disabled) onPress()
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="adm-blog-rte__toolbar" role="toolbar" aria-label="Định dạng nội dung">
      {btn('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Đậm')}
      {btn('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Nghiêng')}
      {btn('U', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Gạch chân')}
      {btn('S', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Gạch ngang')}
      <span className="adm-blog-rte__sep" aria-hidden />
      {btn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Tiêu đề 2')}
      {btn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Tiêu đề 3')}
      {btn('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run(), 'Đoạn văn')}
      <span className="adm-blog-rte__sep" aria-hidden />
      {btn('•', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Danh sách')}
      {btn('1.', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Danh sách số')}
      {btn('❝', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Trích dẫn')}
      {btn('Code', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), 'Khối mã')}
      <span className="adm-blog-rte__sep" aria-hidden />
      {btn('🔗', editor.isActive('link'), setLink, 'Liên kết')}
      <span className="adm-blog-rte__sep" aria-hidden />
      <button
        type="button"
        className="adm-blog-rte__btn"
        title="Hoàn tác"
        aria-label="Hoàn tác"
        disabled={disabled || !editor.can().undo()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↺
      </button>
      <button
        type="button"
        className="adm-blog-rte__btn"
        title="Làm lại"
        aria-label="Làm lại"
        disabled={disabled || !editor.can().redo()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↻
      </button>
    </div>
  )
}

export default function AdminBlogRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Soạn nội dung bài viết…',
}: AdminBlogRichTextEditorProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          HTMLAttributes: {
            rel: 'noopener noreferrer nofollow',
            target: '_blank',
          },
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: value || '<p></p>',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'adm-blog-rte__prose',
          translate: 'no',
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
    },
    [],
  )

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!editor) return
    if (editor.isFocused) return
    const cur = editor.getHTML()
    if (isSameHtml(cur, value)) return
    editor.commands.setContent(value || '<p></p>', { emitUpdate: false })
  }, [editor, value])

  return (
    <div className={`adm-blog-rte${disabled ? ' adm-blog-rte--disabled' : ''}`}>
      <Toolbar editor={editor} disabled={disabled} />
      <div className="adm-blog-rte__surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
