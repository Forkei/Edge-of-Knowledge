import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://edge-of-knowledge.vercel.app'),
  title: 'Edge of Knowledge',
  description: 'Where your curiosity meets the frontier of science. Upload any image and explore what humanity knows, debates, and has yet to discover.',
  keywords: ['science', 'education', 'AI', 'research', 'curiosity', 'learning', 'discovery'],
  authors: [{ name: 'Forkei' }],
  creator: 'Forkei',
  publisher: 'Forkei',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://edge-of-knowledge.vercel.app',
    siteName: 'Edge of Knowledge',
    title: 'Edge of Knowledge',
    description: 'Where your curiosity meets the frontier of science',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Edge of Knowledge - Explore the frontier of science',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Edge of Knowledge',
    description: 'Where your curiosity meets the frontier of science',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
