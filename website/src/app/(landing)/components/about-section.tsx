'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardDecorator } from '@/components/ui/card-decorator';
import { Eye, ShieldCheck, Smartphone, Globe } from 'lucide-react';

const values = [
  {
    icon: Eye,
    title: 'Real-Time Monitoring',
    description:
      'Manobela detects distraction and drowsiness live while you drive, using only a phone camera.',
  },
  {
    icon: Smartphone,
    title: 'Phone-Only by Design',
    description:
      'No extra hardware needed. The app works on any smartphone, regardless of device specs.',
  },
  {
    icon: ShieldCheck,
    title: 'Server-Side Inference',
    description:
      'All processing happens on our servers, so the mobile device does not affect performance or accuracy.',
  },
  {
    icon: Globe,
    title: 'Built for Real Roads',
    description:
      'Designed for everyday drivers in low- and middle-income regions where affordable safety solutions matter most.',
  },
];

export function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            About Manobela
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Eyes on the road.</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Manobela is a driver monitoring system that detects unsafe behaviors like distraction
            and drowsiness using only a smartphone camera. Because inference runs on our servers, it
            works on any phone and stays fast and accurate.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 mb-12">
          {values.map((value, index) => (
            <Card key={index} className="group shadow-xs py-2">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <CardDecorator>
                    <value.icon className="h-6 w-6" aria-hidden />
                  </CardDecorator>
                  <h3 className="mt-6 font-medium text-balance">{value.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm">{value.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-muted-foreground">
              Built to improve safety, not device requirements
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" className="cursor-pointer" asChild>
              <a href="#faq">Learn How It Works</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
