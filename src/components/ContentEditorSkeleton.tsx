import React from 'react'
import { Card, CardContent, CardHeader } from './ui/card'
import { FileText } from 'lucide-react'

export function ContentEditorSkeleton() {
  return (
    <Card className="w-full" data-testid="content-editor-skeleton">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>

        {/* Editor canvas skeleton */}
        <div className="min-h-[400px] border rounded-md p-4 bg-gray-50">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}