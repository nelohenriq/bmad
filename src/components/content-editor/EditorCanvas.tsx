import React, { forwardRef } from 'react'

interface EditorCanvasProps {
  content: string
  onChange: (content: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  readOnly: boolean
  className?: string
}

export const EditorCanvas = forwardRef<HTMLDivElement, EditorCanvasProps>(
  ({ content, onChange, onKeyDown, readOnly, className }, ref) => {
    return (
      <div
        ref={ref}
        contentEditable={!readOnly}
        className={`min-h-[400px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-sm max-w-none ${
          readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
        } ${className || ''}`}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyDown={onKeyDown}
        dangerouslySetInnerHTML={{ __html: content }}
        suppressContentEditableWarning={true}
        role="textbox"
        aria-label="Content editor"
        aria-multiline="true"
        aria-describedby="editor-help"
        aria-required="false"
        aria-invalid="false"
        tabIndex={0}
        spellCheck="true"
        autoCorrect="on"
        autoCapitalize="sentences"
      />
    )
  }
)

EditorCanvas.displayName = 'EditorCanvas'