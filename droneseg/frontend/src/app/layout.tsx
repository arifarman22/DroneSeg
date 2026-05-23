import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'DroneSeg — AI Vision Platform',
  description: 'Semantic segmentation for drone imagery',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">DroneSeg</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              Workspace
            </Link>
            <Link href="/history" className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              History
            </Link>
          </div>
        </nav>
        <main className="flex-1 pt-14">{children}</main>
      </body>
    </html>
  )
}
