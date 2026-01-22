import type { Metadata } from 'next';
import { LandingPageContent } from './landing-page-content';

// Metadata for the landing page
export const metadata: Metadata = {
  title: 'Manobela - Driver Monitoring System',
  description: 'A driver monitoring system.',
  keywords: [
    'driver monitoring',
    'driver monitoring system',
    'drivers',
    'cars',
    'live',
    'realtime',
    'mobile',
    'app',
    'computer-vision',
  ],
  openGraph: {
    title: 'Manobela - Driver Monitoring System',
    description: 'A driver monitoring system.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manobela - Driver Monitoring System',
    description: 'A driver monitoring system.',
  },
};

export default function LandingPage() {
  return <LandingPageContent />;
}
