import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import StyledComponentsRegistry from '@/utils/AntRegistry'

export const metadata: Metadata = {
  title: 'Tip Driver',
  description: 'Gather tips anywhere',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com"/>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin='anonymous'></link>
          <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200;0,300;0,400;0,600;0,800;1,300&display=swap" rel="stylesheet"></link>
        </head>
        <body>
          <StyledComponentsRegistry>
            {children}
          </StyledComponentsRegistry>
        </body>
      </html>
    </ClerkProvider>
  )
}
