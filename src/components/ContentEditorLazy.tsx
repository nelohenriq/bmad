import React, { Suspense, lazy } from 'react'
import { ContentEditorSkeleton } from './ContentEditorSkeleton'

// Lazy load the ContentEditor component
const ContentEditor = lazy(() => import('./ContentEditor').then(module => ({ default: module.ContentEditor })))

interface ContentEditorLazyProps {
  contentId: string
  initialContent?: string
  onSave?: (content: string) => void
  onChange?: (content: string) => void
  readOnly?: boolean
}

export function ContentEditorLazy(props: ContentEditorLazyProps) {
  return (
    <Suspense fallback={<ContentEditorSkeleton />}>
      <ContentEditor {...props} />
    </Suspense>
  )
}