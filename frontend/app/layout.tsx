import type { Metadata, Viewport } from 'next'
import './globals.css'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Debatio - Structured Truth Discovery',
  description: 'A platform for structured debates and roundtable discussions aimed at discovering truth, not winning arguments.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
