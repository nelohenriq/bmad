import React from 'react'

interface ContentChange {
  type: 'insert' | 'delete' | 'modify'
  position: number
  length: number
  content: string
  timestamp: Date
}

interface ChangeTrackerProps {
  changes: ContentChange[]
  lastSaved: Date | null
  timeSpent: number
}

export function ChangeTracker({ changes, lastSaved, timeSpent }: ChangeTrackerProps) {
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60)
    const seconds = Math.floor((ms / 1000) % 60)
    return `${minutes}m ${seconds}s`
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500" role="status" aria-live="polite">
      {lastSaved && (
        <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
      )}
      <span>Session: {formatTime(timeSpent)}</span>
      {changes.length > 0 && (
        <span className="text-orange-600" aria-label={`${changes.length} unsaved changes`}>
          {changes.length} unsaved changes
        </span>
      )}
    </div>
  )
}