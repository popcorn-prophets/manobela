import { ScrollView, View } from 'react-native';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Text } from '@/components/ui/text';

export default function GuideScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <Text className="mb-6 text-muted-foreground">
        Learn how Manobela works and how to use it during your drives.
      </Text>

      <Accordion type="multiple" collapsible>
        <AccordionItem value="quick-start">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Quick Start</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                1. Grant camera permissions when prompted
              </Text>
              <Text className="text-sm text-muted-foreground">
                2. Mount your device on the dashboard at eye level, ensuring your full face is
                visible
              </Text>
              <Text className="text-sm text-muted-foreground">
                3. Check connection status shows "Ready" or "Connected"
              </Text>
              <Text className="text-sm text-muted-foreground">
                4. Test while parked to ensure everything works
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="camera-tips">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Camera Setup Tips</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                • Position camera at eye level or slightly above, centered on your face
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Ensure good lighting—avoid backlighting and remove sunglasses
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Keep your entire face visible in frame
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Clean the camera lens regularly
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="metrics">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">What Each Metric Means</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-3">
              <View>
                <Text className="font-semibold">👁️ Eyes</Text>
                <Text className="text-sm text-muted-foreground">
                  Tracks eye closure frequency and duration to detect fatigue (EAR, PERCLOS)
                </Text>
              </View>
              <View>
                <Text className="font-semibold">😴 Yawn</Text>
                <Text className="text-sm text-muted-foreground">
                  Detects yawning as an indicator of drowsiness
                </Text>
              </View>
              <View>
                <Text className="font-semibold">👤 Head</Text>
                <Text className="text-sm text-muted-foreground">
                  Monitors head orientation (yaw, pitch, roll) to detect looking away from the road
                </Text>
              </View>
              <View>
                <Text className="font-semibold">🎯 Gaze</Text>
                <Text className="text-sm text-muted-foreground">
                  Tracks eye direction to detect when you're not looking forward
                </Text>
              </View>
              <View>
                <Text className="font-semibold">📱 Phone</Text>
                <Text className="text-sm text-muted-foreground">
                  Detects phone usage while driving
                </Text>
              </View>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="usage">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Using During Drives</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                1. Set up and verify connection before driving
              </Text>
              <Text className="text-sm text-muted-foreground">
                2. Tap green "Start" button to begin monitoring
              </Text>
              <Text className="text-sm text-muted-foreground">
                3. Drive normally—metrics update automatically
              </Text>
              <Text className="text-sm text-muted-foreground">
                4. Red indicators mean alerts detected; check only when safe
              </Text>
              <Text className="text-sm text-muted-foreground">
                5. Tap "Stop" when finished; review results in Insights tab
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="understanding-results">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Understanding Results</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                • Green/Gray = Normal | Red = Alert condition
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Multiple simultaneous alerts suggest fatigue or distraction
              </Text>
              <Text className="text-sm text-muted-foreground">
                • High eye closure or yawning = drowsiness—take a break
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Track patterns over time to improve driving habits
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="troubleshooting">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Troubleshooting</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                Connection issues: Check internet, restart app, avoid restricted networks
              </Text>
              <Text className="text-sm text-muted-foreground">
                Camera issues: Verify permissions, ensure no other app is using it
              </Text>
              <Text className="text-sm text-muted-foreground">
                Metrics not updating: Ensure face is visible and well-lit, remove sunglasses
              </Text>
              <Text className="text-sm text-muted-foreground">
                Keep device plugged in during long drives
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="best-practices">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Best Practices & Safety</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                • Never interact with the app while driving—set up before starting
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Pull over safely if you need to check metrics
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Take breaks if multiple fatigue alerts appear
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Get adequate sleep, avoid distractions, stay hydrated
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger>
            <Text className="text-lg font-semibold">Privacy & Data</Text>
          </AccordionTrigger>
          <AccordionContent>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                • Video is analyzed in real-time but never recorded or stored
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Only metric statistics are stored locally on your device
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Secure encrypted connection; no data shared with third parties
              </Text>
              <Text className="text-sm text-muted-foreground">
                • You control monitoring and can delete data anytime
              </Text>
            </View>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollView>
  );
}
