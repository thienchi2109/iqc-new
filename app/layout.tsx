import './globals.css'
// import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'C-Lab IQC Pro',
  description: 'Clinical Laboratory Internal Quality Control Management System',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}