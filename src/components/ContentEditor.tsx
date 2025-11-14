import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Bold,
  Italic,
  List,
  Link,
  Save,
  Undo,
  Redo,
  FileText,
  Upload,
} from 'lucide-react'

interface ContentEditorProps {
  contentId: string
  initialContent?: string
  onSave?: (content: string) => void
  onChange?: (content: string) => void
  readOnly?: boolean
}

interface ContentChange {
  type: 'insert' | 'delete' | 'modify'
  position: number
  length: number
  content: string
  timestamp: Date
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  contentId,
  initialContent = '',
  onSave,
  onChange,
  readOnly = false,
}) => {
  const [content, setContent] = useState(initialContent)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [changes, setChanges] = useState<ContentChange[]>([])
  const editorRef = useRef<HTMLDivElement>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()

  // Session and time tracking
  const [sessionId] = useState(
    () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  )
  const [sessionStartTime] = useState(() => Date.now())
  const [timeSpent, setTimeSpent] = useState(0)
  const timeTrackingRef = useRef<NodeJS.Timeout>()

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/content/${contentId}/edit`)
      if (response.ok) {
        const data = await response.json()
        setContent(data.content || '')
        setLastSaved(new Date(data.updatedAt))
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [contentId])

  // Load content on mount
  useEffect(() => {
    if (contentId && !initialContent) {
      loadContent()
    }
  }, [contentId, loadContent])

  // Time tracking
  useEffect(() => {
    timeTrackingRef.current = setInterval(() => {
      setTimeSpent(Date.now() - sessionStartTime)
    }, 1000)

    return () => {
      if (timeTrackingRef.current) {
        clearInterval(timeTrackingRef.current)
      }
    }
  }, [sessionStartTime])

  const handleAutoSave = useCallback(async () => {
    if (!contentId || readOnly) return

    try {
      const response = await fetch(`/api/content/${contentId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          changes,
          autoSave: true,
          sessionId,
          timeSpentMs: timeSpent,
        }),
      })

      if (response.ok) {
        setLastSaved(new Date())
        setChanges([])
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [contentId, readOnly, content, changes, sessionId, timeSpent])

  // Auto-save functionality
  useEffect(() => {
    if (content !== initialContent && !readOnly) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, 30000) // 30 seconds
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [content, handleAutoSave, initialContent, readOnly])

  const handleSave = async () => {
    if (!contentId || readOnly) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/content/${contentId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          changes,
          sessionId,
          timeSpentMs: timeSpent,
        }),
      })

      if (response.ok) {
        setLastSaved(new Date())
        setChanges([])
        onSave?.(content)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      onChange?.(newContent)

      // Track changes
      const change: ContentChange = {
        type: 'modify',
        position: 0,
        length: newContent.length,
        content: newContent,
        timestamp: new Date(),
      }
      setChanges((prev) => [...prev, change])
    },
    [onChange]
  )

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          execCommand('bold')
          break
        case 'i':
          e.preventDefault()
          execCommand('italic')
          break
        case 's':
          e.preventDefault()
          handleSave()
          break
      }
    }
  }

  const exportContent = async (format: 'markdown' | 'html') => {
    try {
      const response = await fetch(`/api/content/${contentId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `content-${contentId}.${format === 'markdown' ? 'md' : 'html'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (isLoading && !content) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading content...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Editor
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
            <span>
              Session: {Math.floor(timeSpent / 1000 / 60)}m{' '}
              {Math.floor((timeSpent / 1000) % 60)}s
            </span>
            {changes.length > 0 && (
              <span className="text-orange-600">
                {changes.length} unsaved changes
              </span>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => execCommand('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => execCommand('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => execCommand('insertUnorderedList')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                execCommand('createLink', prompt('Enter URL:') || '')
              }
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={insertImage}
              title="Insert Image"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportContent('markdown')}
            >
              Export MD
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportContent('html')}
            >
              Export HTML
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="ml-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          className={`min-h-[400px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-sm max-w-none ${
            readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
          }`}
          onInput={(e) => handleContentChange(e.currentTarget.innerHTML)}
          onKeyDown={handleKeyDown}
          dangerouslySetInnerHTML={{ __html: content }}
          suppressContentEditableWarning={true}
          role="textbox"
          aria-label="Content editor"
          aria-multiline="true"
          aria-describedby="editor-help"
          tabIndex={0}
        />
        <div id="editor-help" className="sr-only">
          Rich text editor. Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+S to
          save. Tab to navigate between toolbar buttons.
        </div>
      </CardContent>
    </Card>
  )
}

export default ContentEditor
