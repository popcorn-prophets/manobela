import type { Metadata } from 'next';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { SidebarConfigProvider } from '@/contexts/sidebar-context';
import { inter } from '@/lib/fonts';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: 'Manobela',
  description: 'A driver monitoring system in your phone.',
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
          <SidebarConfigProvider>{children}</SidebarConfigProvider>
        </ThemeProvider>

        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
