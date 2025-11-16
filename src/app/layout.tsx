import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'

export const metadata: Metadata = {
  title: 'Neural Feed Studio',
  description: 'AI-Powered Multi-Modal Content Pipeline',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerProvider>
          <ThemeProvider>
            {/* Skip Navigation Link */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Skip to main content
            </a>
            <Navigation />
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
          </ThemeProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}
