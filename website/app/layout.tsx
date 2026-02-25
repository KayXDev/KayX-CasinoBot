import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageWrapper from '@/components/PageWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Casino Bot - Exclusive Discord Casino',
  description: 'Exclusive Discord casino experience with advanced games, crypto trading, and premium features. Login to access your account.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <Providers>
          <PageWrapper>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <Footer />
          </PageWrapper>
        </Providers>
      </body>
    </html>
  )
}