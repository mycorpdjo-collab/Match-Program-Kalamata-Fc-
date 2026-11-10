import type { Metadata, Viewport } from 'next';
import './globals.css';
import './pages.css';
import CookieNotice from '@/components/public/CookieNotice';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Match Programme · Καλαμάτα',
  description: 'Το ψηφιακό πρόγραμμα αγώνα της Καλαμάτας Π.Α.Ε.',
  icons: { icon: '/brand/symbol-ink.png' },
};

export const viewport: Viewport = {
  themeColor: '#e9e8e8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
