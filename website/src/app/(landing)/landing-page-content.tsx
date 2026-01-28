'use client';

import { LandingNavbar } from '@/components/navbar';
import { LandingFooter } from '@/components/footer';
import { HeroSection } from './components/hero-section';
import { LogoCarousel } from './components/logo-carousel';
import { StatsSection } from './components/stats-section';
import { FeaturesSection } from './components/features-section';
import { TeamSection } from './components/team-section';
import { TestimonialsSection } from './components/testimonials-section';
import { PricingSection } from './components/pricing-section';
import { CTASection } from './components/cta-section';
import { ContactSection } from './components/contact-section';
import { FaqSection } from './components/faq-section';
import { AboutSection } from './components/about-section';

export function LandingPageContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <LandingNavbar />

      {/* Main Content */}
      <main>
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <FeaturesSection />
        <TeamSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CTASection />
        <ContactSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
