'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const plan = {
  name: 'Free for Everyone',
  description: 'Full access to Manobela at no cost while we build and improve the system.',
  features: [
    'Real-time driver monitoring',
    'Distraction and drowsiness detection',
    'Safety alerts and reminders',
    'Works on any smartphone',
    'No data collection or tracking',
  ],
  cta: 'Get Started',
};

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 sm:py-32 bg-muted/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Free for all—no catch
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Manobela is currently available at no cost for everyone. Use it freely as we continue to
            improve the system.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border bg-card">
            <div className="grid lg:grid-cols-1">
              <div className="p-8 grid grid-rows-subgrid row-span-4 gap-6">
                {/* Plan Header */}
                <div>
                  <div className="text-lg font-medium tracking-tight mb-2">{plan.name}</div>
                  <div className="text-muted-foreground text-sm">{plan.description}</div>
                </div>

                {/* Pricing */}
                <div>
                  <div className="text-4xl font-bold mb-1">$0</div>
                  <div className="text-muted-foreground text-sm">Free forever (for now)</div>
                </div>

                {/* CTA Button */}
                <div>
                  <Button className="w-full cursor-pointer my-2" variant="default">
                    {plan.cta}
                  </Button>
                </div>

                {/* Features */}
                <div>
                  <ul role="list" className="space-y-3 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check
                          className="text-muted-foreground size-4 flex-shrink-0"
                          strokeWidth={2.5}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Note */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Have questions or want to partner with us?{' '}
            <Button variant="link" className="p-0 h-auto cursor-pointer" asChild>
              <a href="#contact">Contact our team</a>
            </Button>
          </p>
        </div>
      </div>
    </section>
  );
}
