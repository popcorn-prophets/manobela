import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GUIDE_SECTIONS, ContentItem } from '@/constants/guide-content';

export default function GuideScreen() {
  const renderContentItem = (item: ContentItem, index: number, sectionIndex: number) => {
    const key = `${sectionIndex}-${index}`;

    if (item.type === 'spacer') {
      return <View key={key} className="h-2" />;
    }

    let prefix = '';
    let textColor = 'text-muted-foreground';

    if (item.type === 'bullet') {
      prefix = '• ';
      textColor = 'text-foreground';
    } else if (item.type === 'numbered') {
      // Calculate the actual number based on previous numbered items in this section
      const section = GUIDE_SECTIONS[sectionIndex];
      const numberedIndex = section.content
        .slice(0, index)
        .filter((c) => c.type === 'numbered').length;
      prefix = `${numberedIndex + 1}. `;
      textColor = 'text-foreground';
    } else if (item.type === 'paragraph') {
      prefix = '';
      textColor = 'text-muted-foreground';
    }

    return (
      <Text key={key} className={`text-sm leading-relaxed ${textColor}`}>
        {prefix}
        {item.text}
      </Text>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Stack.Screen options={{ title: 'Guide' }} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Welcome to Manobela</CardTitle>
          <CardDescription>
            Your driver monitoring assistant. Learn how the app works, what each metric means, and
            best practices for safe driving.
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="multiple" collapsible className="gap-3">
        {GUIDE_SECTIONS.map((section, sectionIndex) => (
          <AccordionItem key={section.id} value={section.id} className="border-0">
            <Card>
              <AccordionTrigger className="px-6 py-4">
                <View className="flex-1 flex-row flex-wrap items-center gap-2">
                  <Text className="text-lg font-semibold">{section.title}</Text>
                  {section.important && (
                    <Badge variant="destructive">
                      <Text>Important</Text>
                    </Badge>
                  )}
                </View>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pb-4 pt-0">
                  <View className="gap-3">
                    {section.content.map((item, idx) => renderContentItem(item, idx, sectionIndex))}
                  </View>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollView>
  );
}
