'use client';

import { Eye, Zap, Smartphone, ShieldCheck, BarChart3, Users, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Image3D } from '@/components/image-3d';

const mainFeatures = [
  {
    icon: Eye,
    title: 'Real-Time Driver Monitoring',
    description:
      'Continuously detects distraction, drowsiness, and inattention as they happen—not after an accident.',
  },
  {
    icon: Smartphone,
    title: 'Phone-Only Setup',
    description: 'No infrared cameras, no vehicle integration. Just mount your phone and drive.',
  },
  {
    icon: Zap,
    title: 'Instant Alerts',
    description:
      'Provides timely warnings that help drivers correct behavior before it turns dangerous.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy by Default',
    description:
      'All processing runs on-device. No cloud uploads, no behavioral tracking, no data harvesting.',
  },
];

const secondaryFeatures = [
  {
    icon: Cpu,
    title: 'On-Device Computer Vision',
    description:
      'Optimized models designed to run efficiently on mobile hardware in real-world conditions.',
  },
  {
    icon: BarChart3,
    title: 'Behavior Insights (Optional)',
    description:
      'Understand driving patterns over time with local summaries—no centralized data collection.',
  },
  {
    icon: Users,
    title: 'Built for Everyday Drivers',
    description:
      'Equally useful for private motorists, ride-share drivers, and future fleet deployments.',
  },
  {
    icon: Smartphone,
    title: 'Works Anywhere',
    description:
      'Designed for diverse lighting, road, and vehicle conditions common in emerging markets.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Core Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Safety that reacts before accidents happen
          </h2>
        </div>

        {/* First Feature Section */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8 xl:gap-16 mb-24">
          {/* Left Image */}
          <Image3D
            lightSrc="/feature-1-light.png"
            darkSrc="/feature-1-dark.png"
            alt="Driver monitoring visualization"
            direction="left"
          />

          {/* Right Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Detect risk the moment it appears
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                Most crashes are caused by momentary lapses—looking away, nodding off, or losing
                focus. Manobela identifies these behaviors instantly and prompts corrective action
                before it’s too late.
              </p>
            </div>

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
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Designed for real roads, not lab conditions
              </h3>
              <p className="text-muted-foreground text-base text-pretty">
                Manobela is built with the realities of everyday driving in mind—varied lighting,
                different vehicles, and environments where expensive hardware is not an option.
              </p>
            </div>

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
            alt="On-device computer vision"
            direction="right"
            className="order-1 lg:order-2"
          />
        </div>
      </div>
    </section>
  );
}
