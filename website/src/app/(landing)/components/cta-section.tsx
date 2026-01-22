'use client';

import { ArrowRight, Eye, Smartphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function CTASection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/80">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="space-y-8">
              {/* Main Content */}
              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Drive safer
                  <span className="flex sm:inline-flex justify-center">
                    <span className="relative mx-2">
                      <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        every trip
                      </span>
                      <div className="absolute start-0 -bottom-2 h-1 w-full bg-gradient-to-r from-primary/30 to-secondary/30" />
                    </span>
                    today
                  </span>
                </h1>

                <p className="text-muted-foreground mx-auto max-w-2xl text-balance lg:text-xl">
                  Manobela monitors driver behavior in real time using only a phone camera. Get
                  alerts for distraction and drowsiness with no extra hardware and no cost for now.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col justify-center gap-4 sm:flex-row sm:gap-6">
                <Button size="lg" className="cursor-pointer px-8 py-6 text-lg font-medium" asChild>
                  <a href="/download">
                    <Smartphone className="me-2 size-5" />
                    Get the App
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
