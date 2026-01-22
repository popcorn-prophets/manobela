'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type Testimonial = {
  name: string;
  role: string;
  image: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    name: 'Alex',
    role: 'Ride-share Driver',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-1',
    quote: 'Manobela helps me stay focused during long shifts. The alerts are clear and timely.',
  },
  {
    name: 'Mia',
    role: 'Fleet Manager',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-2',
    quote:
      'We started using Manobela for safety monitoring. It’s easy to deploy and works on any phone.',
  },
  {
    name: 'Noah',
    role: 'Safety Advocate',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-2',
    quote:
      'The system is simple, effective, and practical. It’s the kind of tool that can actually reduce accidents.',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 sm:py-32">
      <div className="container mx-auto px-8 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            What users are saying
          </h2>
          <p className="text-lg text-muted-foreground">
            Simple, practical feedback from real users.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-none">
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="bg-muted size-12 shrink-0">
                    <AvatarImage
                      alt={testimonial.name}
                      src={testimonial.image}
                      loading="lazy"
                      width="120"
                      height="120"
                    />
                    <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{testimonial.name}</h3>
                    <span className="text-muted-foreground block text-sm tracking-wide">
                      {testimonial.role}
                    </span>
                  </div>
                </div>

                <blockquote className="mt-4">
                  <p className="text-sm leading-relaxed text-balance">{testimonial.quote}</p>
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
