'use client'

import { useServiceWorker } from '@/lib/hooks/useServiceWorker'

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useServiceWorker()
  return <>{children}</>
}