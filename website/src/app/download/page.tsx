import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Download Manobela',
  description: 'Download Manobela mobile app.',
  keywords: ['mobile', 'app', 'download'],
};

export default function DownloadPage() {
  const apkUrl = '/app/manobela.apk';

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <main className="max-w-xl mx-auto">
        <Card className="shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl">Download Manobela</CardTitle>
            <CardDescription className="mt-2">
              Get the latest version of the Manobela mobile app for Android.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4">
            <Button asChild>
              <a href={apkUrl} download>
                Download APK
              </a>
            </Button>

            <p className="text-sm text-muted-foreground">
              Version: <span className="font-medium">1.0.0</span>
            </p>

            <Separator className="w-full" />

            <div className="w-full">
              <h2 className="text-lg font-semibold mb-2">How to Install</h2>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Download the APK using the button above.</li>
                <li>Open the downloaded file on your Android device.</li>
                <li>If prompted, enable installation from unknown sources.</li>
                <li>Follow the on-screen instructions to install.</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              By downloading, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
