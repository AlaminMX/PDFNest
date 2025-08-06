// app/layout.tsx
import { ReactNode } from 'react'

export const metadata = {
  title: 'PDFNest',
  description: 'Organize and manage PDFs with ease.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
