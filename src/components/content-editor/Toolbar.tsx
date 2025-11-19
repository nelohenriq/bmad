import React from 'react'
import { Button } from '../ui/button'
import {
  Bold,
  Italic,
  List,
  Link,
  Upload,
  History,
} from 'lucide-react'

interface ToolbarProps {
  onBold: () => void
  onItalic: () => void
  onList: () => void
  onLink: () => void
  onImage: () => void
  onShowHistory: () => void
  includeCitations: boolean
  onToggleCitations: (checked: boolean) => void
  exportFormat: string
  onExportFormatChange: (format: string) => void
  isExporting: boolean
  onSave: () => void
  isLoading: boolean
  readOnly: boolean
}

export function Toolbar({
  onBold,
  onItalic,
  onList,
  onLink,
  onImage,
  onShowHistory,
  includeCitations,
  onToggleCitations,
  exportFormat,
  onExportFormatChange,
  isExporting,
  onSave,
  isLoading,
  readOnly,
}: ToolbarProps) {
  if (readOnly) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onBold}
        title="Bold (Ctrl+B)"
        aria-label="Bold text"
      >
        <Bold className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onItalic}
        title="Italic (Ctrl+I)"
        aria-label="Italic text"
      >
        <Italic className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onList}
        title="Bullet List"
        aria-label="Insert bullet list"
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onLink}
        title="Insert Link"
        aria-label="Insert link"
      >
        <Link className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onImage}
        title="Insert Image"
        aria-label="Insert image"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div className="w-px h-6 bg-gray-300 mx-2" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={includeCitations}
            onChange={(e) => onToggleCitations(e.target.checked)}
            className="rounded"
            aria-label="Include citations in export"
          />
          Include Citations
        </label>
      </div>
      <select
        value={exportFormat}
        onChange={(e) => onExportFormatChange(e.target.value)}
        className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Export format"
      >
        <option value="markdown">Markdown</option>
        <option value="html">HTML</option>
        <option value="pdf">PDF (Coming Soon)</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={onShowHistory}
        title="Export History"
        aria-label="Show export history"
      >
        <History className="h-4 w-4" aria-hidden="true" />
      </Button>
      {isExporting && (
        <span className="text-sm text-blue-600 flex items-center" aria-live="polite">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" aria-hidden="true"></div>
          Exporting...
        </span>
      )}
      <Button
        onClick={onSave}
        disabled={isLoading}
        className="ml-auto"
        aria-label={isLoading ? 'Saving content' : 'Save content'}
      >
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}