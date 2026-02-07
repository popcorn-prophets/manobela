import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { LandingNavbar } from '@/components/navbar';
import { LandingFooter } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DownloadIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download Manobela',
  description: 'Download the latest Manobela mobile app.',
  keywords: ['mobile', 'app', 'download'],
};

const instructions = {
  android: [
    'Download the APK using the button above.',
    'Open the downloaded file on your Android device.',
    'If prompted, enable installation from unknown sources.',
    'Follow the on-screen instructions to complete the installation.',
  ],
  googlePlay: [
    'Visit Google Play using the button above.',
    'Tap "Install" to download and install the app automatically.',
  ],
  apple: ['The Apple App Store version is planned.', 'Check back here once it becomes available.'],
};

interface ReleaseInfo {
  appVersion: string;
  apkUrl: string;
  apkSize: string | null;
}

// Fetch the latest GitHub release at build/render time
async function fetchLatestRelease(): Promise<ReleaseInfo> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/popcorn-prophets/manobela/releases/latest',
      { next: { revalidate: 3600 } } // cache for 1 hour
    );

    if (!res.ok) throw new Error('GitHub API failed');

    const data = await res.json();
    const asset = data.assets?.[0]; // first asset, adjust if needed
    const sizeBytes = asset?.size ?? 0;
    const sizeMb = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) : null;

    return {
      appVersion: data.tag_name,
      apkUrl: asset?.browser_download_url,
      apkSize: sizeMb ? `${sizeMb} MB` : null,
    };
  } catch (err) {
    console.warn('Failed to fetch GitHub release, using fallback:', err);
    return {
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      apkUrl:
        process.env.NEXT_PUBLIC_APK_URL ||
        'https://github.com/popcorn-prophets/manobela/releases/latest',
      apkSize: null,
    };
  }
}

export default async function DownloadPage() {
  const { appVersion, apkUrl, apkSize } = await fetchLatestRelease();

  const googlePlayUrl =
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ||
    'https://play.google.com/store/apps/details?id=com.manobela.app';
  const appleAppStoreUrl =
    process.env.NEXT_PUBLIC_APPLE_APP_STORE_URL || 'https://apps.apple.com/app/id1234567890';

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <main className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Download Section */}
          <section className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Download Manobela</h1>
            <p className="mt-3 text-base md:text-lg text-muted-foreground">
              Get the latest version of the mobile app for Android and iOS.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Version: <span className="font-bold">{appVersion}</span>
              </p>
              <div className="my-2 flex flex-col sm:flex-row items-center gap-2">
                <Button asChild className="w-fit">
                  <a href={apkUrl} download>
                    <DownloadIcon />
                    <span>Download APK</span>
                    <span className="text-xs text-muted">{apkSize ? `(${apkSize})` : null}</span>
                  </a>
                </Button>

                <a href={googlePlayUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                    alt="Get it on Google Play"
                    className="h-14"
                  />
                </a>

                <div className="opacity-50 pointer-events-none">
                  <img
                    src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us"
                    alt="Coming soon on the App Store"
                    className="h-10.5"
                  />
                </div>
              </div>
            </div>
          </section>

          <Separator className="my-10" />

          {/* QR Code Section */}
          <section className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Scan to Download</h2>
            <div className="inline-block bg-white p-4 rounded-xl">
              <QRCode value={apkUrl || ''} size={180} />
            </div>
            <p className="text-sm text-muted-foreground">
              Scan with your phone camera to download directly.
            </p>
          </section>

          <Separator className="my-10" />

          {/* Instructions Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">How to Install</h2>

            {/* Android Instructions */}
            <div>
              <h3 className="text-xl font-medium">Android Devices</h3>
              <h4 className="text-lg font-medium mt-2">Using the APK</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {instructions.android.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>

              <h4 className="text-lg font-medium mt-4">Using Google Play</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {instructions.googlePlay.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Apple Instructions */}
            <div>
              <h3 className="text-xl font-medium">iOS Devices</h3>
              <p className="text-sm text-muted-foreground mt-2">{instructions.apple.join(' ')}</p>
            </div>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              By downloading, you agree to our{' '}
              <Link href="/terms" className="text-primary">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary">
                Privacy Policy
              </Link>
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
