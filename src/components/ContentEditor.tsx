import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Toolbar } from './content-editor/Toolbar'
import { EditorCanvas } from './content-editor/EditorCanvas'
import { ExportPanel } from './content-editor/ExportPanel'
import { ChangeTracker } from './content-editor/ChangeTracker'
import { Skeleton } from './ui/skeleton'
import { FileText } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { toast } from '@/lib/hooks/useToast'

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
  const [isExporting, setIsExporting] = useState(false)
  const [exportHistory, setExportHistory] = useState<any[]>([])
  const [showExportHistory, setShowExportHistory] = useState(false)
  const [includeCitations, setIncludeCitations] = useState(false)
  const [exportFormat, setExportFormat] = useState('markdown')
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
    const result = await apiClient.get(`/api/content/${contentId}/edit`)
    if (result.success && result.data) {
      setContent((result.data as any).content || '')
      setLastSaved(new Date((result.data as any).updatedAt))
    }
    setIsLoading(false)
  }, [contentId])

  const loadExportHistory = useCallback(async () => {
    const result = await apiClient.get(`/api/content/${contentId}/exports`)
    if (result.success && result.data) {
      setExportHistory((result.data as any).exports || [])
    }
  }, [contentId])

  // Load content and export history on mount
  useEffect(() => {
    if (contentId) {
      if (!initialContent) {
        loadContent()
      }
      loadExportHistory()
    }
  }, [contentId, initialContent, loadContent, loadExportHistory])

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

    const result = await apiClient.put(`/api/content/${contentId}/edit`, {
      content,
      changes,
      autoSave: true,
      sessionId,
      timeSpentMs: timeSpent,
    })

    if (result.success) {
      setLastSaved(new Date())
      setChanges([])
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
  }, [content, initialContent, readOnly, handleAutoSave])

  const handleSave = async () => {
    if (!contentId || readOnly) return

    setIsLoading(true)
    const result = await apiClient.put(`/api/content/${contentId}/edit`, {
      content,
      changes,
      sessionId,
      timeSpentMs: timeSpent,
    })

    setIsLoading(false)

    if (result.success) {
      setLastSaved(new Date())
      setChanges([])
      onSave?.(content)
      toast({
        title: 'Content Saved',
        description: 'Your changes have been saved successfully.',
      })
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

  const exportContent = async (format: 'markdown' | 'html' | 'pdf', citationStyle?: 'APA' | 'MLA' | 'Chicago') => {
    setIsExporting(true)
    const result = await apiClient.postBlob(`/api/content/${contentId}/export`, {
      format,
      includeCitations,
      citationStyle
    })

    setIsExporting(false)

    if (result.success && result.data) {
      const url = window.URL.createObjectURL(result.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `content-${contentId}.${format === 'markdown' ? 'md' : format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Reload export history
      await loadExportHistory()

      toast({
        title: 'Export Complete',
        description: `Content exported as ${format.toUpperCase()}.`,
      })
    }
  }

  if (isLoading && !content) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-24" />
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
            <FileText className="h-5 w-5" aria-hidden="true" />
            Content Editor
          </CardTitle>
          <ChangeTracker
            changes={changes}
            lastSaved={lastSaved}
            timeSpent={timeSpent}
          />
        </div>

        <Toolbar
          onBold={() => execCommand('bold')}
          onItalic={() => execCommand('italic')}
          onList={() => execCommand('insertUnorderedList')}
          onLink={() => execCommand('createLink', prompt('Enter URL:') || '')}
          onImage={insertImage}
          onShowHistory={() => setShowExportHistory(!showExportHistory)}
          includeCitations={includeCitations}
          onToggleCitations={setIncludeCitations}
          exportFormat={exportFormat}
          onExportFormatChange={(format) => {
            setExportFormat(format)
            if (format !== 'pdf') {
              exportContent(format as 'markdown' | 'html')
            }
          }}
          isExporting={isExporting}
          onSave={handleSave}
          isLoading={isLoading}
          readOnly={readOnly}
        />
      </CardHeader>

      <CardContent>
        <EditorCanvas
          ref={editorRef}
          content={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
        />
        <div id="editor-help" className="sr-only">
          Rich text editor. Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+S to
          save. Tab to navigate between toolbar buttons. Content is automatically saved every 30 seconds.
        </div>

        <ExportPanel
          exportHistory={exportHistory}
          showHistory={showExportHistory}
        />
      </CardContent>
    </Card>
  )
}

export default ContentEditor
