import type { Metadata } from 'next';

import '@/app/globals.css';

import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: 'Lemontree Resource Dashboard',
  description:
    'Browse food pantries and soup kitchens with a synchronized map, resource list, detail view, and bookmarks.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
