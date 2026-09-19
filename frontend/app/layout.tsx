import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'GitHub Analytics | Personal Dashboard',
  description: 'Personal repository analytics and sync dashboard powered by Spring Boot and Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-zinc-800 selection:text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
