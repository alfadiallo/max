import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: 'Key Elements - Dental Transcription Platform',
  description: 'Professional transcription, translation, and content generation for dental education',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-keyelements-text">
        <Header />
        {children}
      </body>
    </html>
  )
}

