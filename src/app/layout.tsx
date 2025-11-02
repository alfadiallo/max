import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'

function ThemeInitScript() {
  // This runs before hydration to avoid theme flash
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
  (function(){
    try {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var useDark = saved ? saved === 'dark' : prefersDark;
      if (useDark) document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
        `,
      }}
    />
  )
}

export const metadata: Metadata = {
  title: 'Max - Dental Transcription Platform',
  description: 'Professional transcription, translation, and content generation for dental education',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <Header />
        {children}
      </body>
    </html>
  )
}

