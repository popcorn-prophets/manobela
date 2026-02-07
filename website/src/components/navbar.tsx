'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Github, X, Moon, Sun, DownloadIcon, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import { useTheme } from '@/hooks/use-theme';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

const githubUrl =
  process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/popcorn-prophets/manobela';

const buymeacoffeeUrl =
  process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL || 'https://www.buymeacoffee.com/popcornprophets';

const navigationItems = [
  { name: 'Home', href: '/#hero' },
  { name: 'Features', href: '/#features' },
  { name: 'Team', href: '/#team' },
  { name: 'Pricing', href: '/#pricing' },
  { name: 'FAQ', href: '/#faq' },
  { name: 'Contact', href: '/#contact' },
  { name: 'API', href: `${apiUrl}` },
];

// Smooth scroll function
const smoothScrollTo = (targetId: string) => {
  if (targetId.startsWith('#')) {
    const element = document.querySelector(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }
};

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer">
            <Logo size={32} />
            <span className="font-bold">Manobela</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden xl:flex">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.name}>
                <NavigationMenuLink
                  className="group inline-flex h-10 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary focus:text-primary focus:outline-none cursor-pointer"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    if (item.href.startsWith('#')) {
                      smoothScrollTo(item.href);
                    } else {
                      window.location.href = item.href;
                    }
                  }}>
                  {item.name}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop CTA */}
        <div className="hidden xl:flex items-center space-x-1">
          <Button asChild size="sm">
            <Link href="/download" className="flex gap-1 mr-1 text-sm">
              <DownloadIcon size={14} />
              <span>Download</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="cursor-pointer">
            <a
              href={`${buymeacoffeeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buy Us a Coffee">
              <Coffee className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild className="cursor-pointer">
            <a
              href={`${githubUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <ModeToggle variant="ghost" />
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:w-100 p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col">
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="space-y-0 p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Logo size={16} />
                  </div>
                  <SheetTitle className="text-lg font-semibold">Manobela</SheetTitle>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild className="cursor-pointer">
                      <a
                        href={`${buymeacoffeeUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Buy Us a Coffee">
                        <Coffee className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild className="cursor-pointer h-8 w-8">
                      <a
                        href={`${githubUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub Repository">
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      className="cursor-pointer h-8 w-8">
                      <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <nav className="p-6 space-y-1">
                  {navigationItems.map((item) => (
                    <div key={item.name}>
                      <a
                        href={item.href}
                        className="flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={(e) => {
                          setIsOpen(false);
                          if (item.href.startsWith('#')) {
                            e.preventDefault();
                            setTimeout(() => smoothScrollTo(item.href), 100);
                          }
                        }}>
                        {item.name}
                      </a>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
