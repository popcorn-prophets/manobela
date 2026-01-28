import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { LandingNavbar } from '@/components/navbar';
import { LandingFooter } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Download Manobela',
  description: 'Download the latest Manobela mobile app.',
  keywords: ['mobile', 'app', 'download'],
};

export default function DownloadPage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

  const apkUrl =
    process.env.NEXT_PUBLIC_APK_URL ||
    'https://github.com/popcorn-prophets/manobela/releases/latest';

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
          <section className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Download Manobela</h1>
            <p className="mt-3 text-base md:text-lg text-muted-foreground">
              Get the latest version of the mobile app for Android and iOS.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Version: <span className="font-bold">{appVersion}</span>
              </p>
              <Button asChild className="w-full max-w-xs">
                <a href={apkUrl} download>
                  Download APK
                </a>
              </Button>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <a
                  href={googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                  aria-label="Get it on Google Play">
                  <div className="h-14 w-42 overflow-hidden rounded-md ">
                    <img
                      src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                      alt="Get it on Google Play"
                      className="h-full w-full object-cover hover:opacity-80 transition-opacity"
                    />
                  </div>
                </a>
                <a
                  href={appleAppStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                  aria-label="Download on the App Store">
                  <div className="h-12 w-38overflow-hidden rounded-md border border-white">
                    <img
                      src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1276560000"
                      alt="Download on the App Store"
                      className="h-full w-full object-cover hover:opacity-80 transition-opacity"
                    />
                  </div>
                </a>
              </div>
            </div>
          </section>

          <Separator className="my-10" />

          <section className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Scan to Download</h2>
            <div className="inline-block bg-white p-4 rounded-xl">
              <QRCode value={apkUrl} size={180} />
            </div>
            <p className="text-sm text-muted-foreground">
              Scan with your phone camera to download directly.
            </p>
          </section>

          <Separator className="my-10" />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">How to Install</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Download the APK using the button above.</li>
              <li>Open the downloaded file on your Android device.</li>
              <li>If prompted, enable installation from unknown sources.</li>
              <li>Follow the on-screen instructions to install.</li>
            </ol>
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
