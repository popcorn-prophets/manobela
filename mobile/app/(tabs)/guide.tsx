import { ScrollView, View } from 'react-native';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Text } from '@/components/ui/text';
import { GUIDE_SECTIONS } from './guide-content';

export default function GuideScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <Text className="mb-6 text-muted-foreground">
        Learn how Manobela works, what each metric means, and how to use the app during your drives.
      </Text>

      <Accordion type="multiple" collapsible>
        {GUIDE_SECTIONS.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger>
              <Text className="text-lg font-semibold">{section.title}</Text>
            </AccordionTrigger>
            <AccordionContent>
              <View className="gap-2">
                {section.content.map((line, idx) => (
                  <Text key={idx} className="text-sm text-muted-foreground">
                    {line}
                  </Text>
                ))}
              </View>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollView>
  );
}
