'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardDecorator } from '@/components/ui/card-decorator';
import { Github, Linkedin, Globe } from 'lucide-react';

const team = [
  {
    id: 1,
    name: 'Andrian Lloyd Maagma',
    role: 'Lead Developer',
    description: '2nd year Computer Science student at the University of the Philippines',
    image: '',
    fallback: 'AM',
    social: {
      linkedin: '#',
      github: '#',
      website: '#',
    },
  },
  {
    id: 2,
    name: 'Dejel Cyrus De Asis',
    role: 'Developer',
    description: '2nd year Computer Science student at the University of the Philippines',
    image: '',
    fallback: 'DC',
    social: {
      linkedin: '#',
      github: '#',
      website: '#',
    },
  },
  {
    id: 3,
    name: 'John Romyr Lopez',
    role: 'Developer',
    description: '2nd year Computer Science student at the University of the Philippines',
    image: '',
    fallback: 'JR',
    social: {
      linkedin: '#',
      github: '#',
      website: '#',
    },
  },
  {
    id: 4,
    name: 'Joshua Ticot',
    role: 'Developer',
    description: '3rd year Computer Science student at the University of the Philippines',
    image: '',
    fallback: 'JT',
    social: {
      linkedin: '#',
      github: '#',
      website: '#',
    },
  },
  {
    id: 5,
    name: 'Jemarco Briz',
    role: 'Developer',
    description: '2nd year Computer Science student at the University of the Philippines',
    image: '',
    fallback: 'JM',
    social: {
      linkedin: '#',
      github: '#',
      website: '#',
    },
  },
];

export function TeamSection() {
  return (
    <section id="team" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Our Team
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Meet our team</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We are a small team building practical technology to improve road safety.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
          {team.map((member) => (
            <Card key={member.id} className="shadow-xs py-2">
              <CardContent className="p-4">
                <div className="text-center">
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <CardDecorator>
                      <Avatar className="h-24 w-24 border shadow-lg">
                        {member.image ? (
                          <AvatarImage
                            src={member.image}
                            alt={member.name}
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-lg font-semibold">
                            {member.fallback}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </CardDecorator>
                  </div>

                  {/* Name and Role */}
                  <h3 className="text-lg font-semibold text-foreground mb-1">{member.name}</h3>
                  <p className="text-sm font-medium text-primary mb-3">{member.role}</p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {member.description}
                  </p>

                  {/* Social Links */}
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:text-primary"
                      asChild>
                      <a
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} LinkedIn`}>
                        <Linkedin className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:text-primary"
                      asChild>
                      <a
                        href={member.social.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} GitHub`}>
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:text-primary"
                      asChild>
                      <a
                        href={member.social.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} Website`}>
                        <Globe className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
