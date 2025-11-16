import React from 'react'

interface ExportHistoryItem {
  id: string
  format: string
  exportedAt: string
  fileSize: number
}

interface ExportPanelProps {
  exportHistory: ExportHistoryItem[]
  showHistory: boolean
}

export function ExportPanel({ exportHistory, showHistory }: ExportPanelProps) {
  if (!showHistory) return null

  return (
    <div className="mt-4 p-4 border-t" role="region" aria-label="Export history">
      <h4 className="text-sm font-medium mb-2">Export History</h4>
      {exportHistory.length === 0 ? (
        <p className="text-sm text-gray-500">No exports yet</p>
      ) : (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {exportHistory.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between text-sm"
              role="listitem"
            >
              <span className="capitalize">{exp.format}</span>
              <span className="text-gray-500">
                {new Date(exp.exportedAt).toLocaleDateString()}
              </span>
              <span className="text-gray-500">
                {(exp.fileSize / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}