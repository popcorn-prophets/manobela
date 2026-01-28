'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardDecorator } from '@/components/ui/card-decorator';
import { ShieldCheck, Lock, Globe, Users } from 'lucide-react';

const values = [
  {
    icon: ShieldCheck,
    title: 'Safety First',
    description:
      'We believe every driver deserves protection on the road, regardless of where they live or what they drive.',
  },
  {
    icon: Lock,
    title: 'Privacy by Design',
    description:
      'Your data belongs to you. We build privacy into every feature, never selling or sharing your personal information.',
  },
  {
    icon: Globe,
    title: 'Accessible to All',
    description:
      "Advanced safety technology shouldn't be a luxury. We're committed to making driver monitoring affordable and available to everyone.",
  },
  {
    icon: Users,
    title: 'User Empowerment',
    description:
      "You're in control. From alerts to data sharing, every decision about your safety and privacy is yours to make.",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Introducing Manobela
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Manobela is a driver monitoring system that detects unsafe behaviors using only a
            smartphone camera.
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
      </div>
    </section>
  );
}
