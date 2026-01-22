'use client';

import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

type FaqItem = {
  value: string;
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    value: 'item-1',
    question: 'What is Manobela?',
    answer:
      'Manobela is a real-time driver monitoring system that detects unsafe driving behaviors using only a smartphone camera.',
  },
  {
    value: 'item-2',
    question: 'How does it work?',
    answer:
      'The app streams video from your phone to a secure server for analysis. When unsafe behavior is detected, Manobela sends an immediate alert.',
  },
  {
    value: 'item-3',
    question: 'Does it work on any phone?',
    answer:
      'Yes. Because inference runs on the server, the phone only needs a camera and an internet connection.',
  },
  {
    value: 'item-4',
    question: 'Is my data collected or stored?',
    answer:
      'No. Manobela is designed with privacy in mind. We do not store personal data or track drivers. Only the minimal signals needed for safety are processed.',
  },
  {
    value: 'item-5',
    question: 'Is Manobela free?',
    answer:
      'Yes. Manobela is currently free for all users while we continue to improve the system.',
  },
];

const FaqSection = () => {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Manobela. Still have questions? We&apos;re here to
            help.
          </p>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-transparent">
            <div className="p-0">
              <Accordion type="single" collapsible className="space-y-5">
                {faqItems.map((item) => (
                  <AccordionItem
                    key={item.value}
                    value={item.value}
                    className="rounded-md !border bg-transparent">
                    <AccordionTrigger className="cursor-pointer items-center gap-4 rounded-none bg-transparent py-2 ps-3 pe-4 hover:no-underline data-[state=open]:border-b">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                          <CircleHelp className="size-5" />
                        </div>
                        <span className="text-start font-semibold">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-transparent">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Contact Support CTA */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Still have questions? We&apos;re here to help.
            </p>
            <Button className="cursor-pointer" asChild>
              <a href="#contact">Contact Support</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export { FaqSection };
