'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DownloadIcon, Play, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DotPattern } from '@/components/dot-pattern';

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-background to-background/80 pt-12 sm:pt-16 pb-16">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        {/* Dot pattern overlay using reusable component */}
        <DotPattern className="opacity-100" size="md" fadeStyle="ellipse" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement Badge */}
          <div className="mb-8 flex justify-center">
            <Badge
              variant="outline"
              className="px-4 py-2 border-amber-400/50 text-amber-400/80 relative overflow-hidden font-semibold z-0">
              <Trophy className="w-4 h-4 mr-1 fill-current" />

              <span className="relative z-10">Won the TrackTech Hackathon 2026!</span>

              {/* Golden shimmer overlay */}
              <span
                className="absolute top-0 left-0 w-[200%] h-full
                     bg-gradient-to-r from-transparent via-amber-200/20 via-amber-400/10 via-amber-200/20 to-transparent
                     animate-gold-shimmer pointer-events-none"></span>
            </Badge>
          </div>

          {/* Main Headline */}
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Prevent Accidents
            </span>
            <br />
            with Just a Phone
          </h1>

          {/* Subheading */}
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Manobela is a real-time driver monitoring system that uses computer vision to detect
            unsafe behaviors using only a smartphone.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="text-base cursor-pointer" asChild>
              <Link href="/download">
                Download Now
                <DownloadIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base cursor-pointer" asChild>
              <a href="#">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </a>
            </Button>
          </div>
        </div>

        {/* Hero Image/Visual */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="relative group">
            {/* Top background glow effect - positioned above the image */}
            <div className="absolute top-1 lg:-top-4 left-1/2 transform -translate-x-1/2 w-[75%] mx-auto h-16 lg:h-44 bg-primary/50 rounded-full blur-3xl"></div>

            <div className="relative rounded-xl border bg-card shadow-2xl">
              <Image
                src="/preview.jpg"
                alt="Preview"
                width={1200}
                height={800}
                className="text-xs text-muted w-full rounded-xl object-cover"
                priority
              />

              {/* Bottom fade effect - gradient overlay that fades the image to background */}
              <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-b from-transparent via-background/30 via-100% to-background rounded-b-xl"></div>

              {/* Overlay play button for demo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="sm"
                  className="rounded-full h-8 w-8 p-0 cursor-pointer hover:scale-105 transition-transform"
                  asChild>
                  <a href="#" aria-label="Watch demo video">
                    <Play className="h-4 w-4 fill-current" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
