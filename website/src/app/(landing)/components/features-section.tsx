'use client';

import { Eye, Zap, Smartphone, ShieldCheck, BarChart3, Map, Upload, Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Image3D } from '@/components/image-3d';

const mainFeatures = [
  {
    icon: Eye,
    title: 'Real-Time Monitoring',
    description: 'Continuously detects distraction, drowsiness, and unsafe behavior as it happens.',
  },
  {
    icon: Zap,
    title: 'Instant Alerts',
    description:
      'Notifies drivers immediately with audio and haptic warnings to prevent accidents.',
  },
  {
    icon: Smartphone,
    title: 'Phone-Only Setup',
    description: 'Works with any smartphone—no extra hardware required.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy-First',
    description: 'Your data stays private. No cloud uploads or behavioral tracking.',
  },
];

const secondaryFeatures = [
  {
    icon: BarChart3,
    title: 'Insights',
    description: 'Session logging and local statistics to track driving behavior over time.',
  },
  {
    icon: Map,
    title: 'Maps & Navigation',
    description: 'Routing, turn-by-turn instructions, and search for drivers.',
  },
  {
    icon: Upload,
    title: 'Uploads',
    description: 'Analyze external videos and integrate them into session data for insights.',
  },
  {
    icon: Sliders,
    title: 'Configurable',
    description: 'Flexible settings to tailor alerts, notifications, and monitoring preferences.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Safety that reacts in real time
          </h2>
          <p className="text-muted-foreground text-base">
            Manobela monitors driver behavior instantly, alerts unsafe actions immediately, works on
            any phone, and ensures your data stays private.
          </p>
        </div>

        {/* First Feature Section */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16 mb-24">
          {/* Left Image */}
          <Image3D
            lightSrc="/feature-1-light.png"
            darkSrc="/feature-1-dark.png"
            alt="Driver monitoring visualization"
            direction="left"
            className="text-xs text-muted"
          />

          {/* Right Content */}
          <div className="space-y-6">
            <ul className="grid gap-4 sm:grid-cols-2">
              {mainFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors">
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    <feature.icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Second Feature Section */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16">
          {/* Left Content */}
          <div className="space-y-6 order-2 lg:order-1">
            <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Tools for deeper insights and flexibility
            </h3>
            <p className="text-muted-foreground text-base text-pretty">
              Beyond real-time monitoring, Manobela helps drivers analyze past sessions, navigate
              routes efficiently, upload external videos for review, and configure alerts and
              monitoring preferences.
            </p>

            <ul className="grid gap-4 sm:grid-cols-2">
              {secondaryFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="group hover:bg-accent/5 flex items-start gap-3 p-2 rounded-lg transition-colors">
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    <feature.icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Image */}
          <Image3D
            lightSrc="/feature-2-light.png"
            darkSrc="/feature-2-dark.png"
            alt="Insights and configurable tools"
            direction="right"
            className="order-1 lg:order-2 text-xs text-muted"
          />
        </div>
      </div>
    </section>
  );
}
