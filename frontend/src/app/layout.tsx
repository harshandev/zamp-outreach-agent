import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zamp — AI Outreach Agent',
  description: 'Personalised B2B outreach powered by AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
