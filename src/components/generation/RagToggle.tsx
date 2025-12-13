import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Info, Check, X } from 'lucide-react'

interface RagToggleProps {
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
  disabled?: boolean
}

const STORAGE_KEY = 'generationMode'

export const RagToggle: React.FC<RagToggleProps> = ({
  enabled: propEnabled,
  onToggle: propOnToggle,
  disabled = false
}) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : false
    }
    return false
  })

  const currentEnabled = propEnabled !== undefined ? propEnabled : enabled

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentEnabled))
    }
  }, [currentEnabled])

  const handleToggle = () => {
    if (disabled) return

    const newEnabled = !currentEnabled

    if (propOnToggle) {
      propOnToggle(newEnabled)
    } else {
      setEnabled(newEnabled)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              RAG Mode
            </h3>
            {currentEnabled && (
              <Badge variant="secondary" className="text-xs">
                Enhanced
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Retrieve relevant content from your RSS feeds before generation for more accurate results
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {currentEnabled ? 'Enabled' : 'Disabled'}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Info className="w-3 h-3" />
            {currentEnabled ? 'Using retrieved context' : 'Direct generation'}
          </div>
        </div>
        <Button
          variant={currentEnabled ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="min-w-20"
          aria-label={`Toggle RAG mode ${currentEnabled ? 'off' : 'on'}`}
          aria-pressed={currentEnabled}
          role="button"
          tabIndex={disabled ? -1 : 0}
        >
          {currentEnabled ? (
            <>
              <Check className="w-4 h-4 mr-1" aria-hidden="true" />
              On
            </>
          ) : (
            <>
              <X className="w-4 h-4 mr-1" aria-hidden="true" />
              Off
            </>
          )}
        </Button>
      </div>
    </div>
  )
}