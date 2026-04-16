import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gut Health Tracker',
  description: 'Track food and bowel movement correlations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}