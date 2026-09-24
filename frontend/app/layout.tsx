import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { CookieConsent } from '@/components/CookieConsent';

export const metadata: Metadata = {
  metadataBase: new URL('https://gitstory.onslate.in'),
  title: {
    default: 'GitStory | Public Developer Analytics',
    template: '%s | GitStory',
  },
  description: 'Public GitHub commit, language distribution, and activity cadence analytics for any developer username.',
  alternates: {
    canonical: 'https://gitstory.onslate.in',
  },
  verification: {
    google: 'pkU6MeHmBFRMX4-G0UpZryN4f6GpCRYG0LZg_xyv-CQ',
  },
  openGraph: {
    title: 'GitStory | Public Developer Analytics',
    description: 'Public GitHub commit, language distribution, and activity cadence analytics for any developer username.',
    url: 'https://gitstory.onslate.in',
    siteName: 'GitStory',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GitStory | Public Developer Analytics',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitStory | Public Developer Analytics',
    description: 'Public GitHub commit, language distribution, and activity cadence analytics for any developer username.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-zinc-800 selection:text-zinc-100">
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
