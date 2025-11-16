'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, Home, FileText, Settings, BarChart3, Rss, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: Brain },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Feeds', href: '/feeds', icon: Rss },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <nav
      className="bg-white shadow-sm border-b"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
                aria-label="Neural Feed Studio home"
              >
                Neural Feed Studio
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8" role="menubar">
              {navigation.map((item) => {
                const Icon = item.icon
                const isCurrent = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md',
                      isCurrent
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                    role="menuitem"
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <Icon
                      className="w-4 h-4 mr-2"
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        className={cn(
          'sm:hidden fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        id="mobile-menu"
        role="region"
        aria-label="Mobile navigation"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-25"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />

        {/* Menu panel */}
        <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close mobile menu"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="py-4" role="menu">
            {navigation.map((item) => {
              const Icon = item.icon
              const isCurrent = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex items-center px-6 py-3 text-base font-medium border-l-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                    isCurrent
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  )}
                  role="menuitem"
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <Icon
                    className="w-5 h-5 mr-3"
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
