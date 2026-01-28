export type ContentItemType = 'bullet' | 'numbered' | 'paragraph' | 'spacer';

export interface ContentItem {
  type: ContentItemType;
  text: string;
}

export interface GuideSection {
  id: string;
  title: string;
  content: ContentItem[];
  important?: boolean;
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'how-to-use',
    title: 'How to Use',
    content: [
      { type: 'numbered', text: 'Grant camera permissions when prompted' },
      { type: 'numbered', text: 'Tap the Record button to begin monitoring' },
      { type: 'numbered', text: 'Drive normally. Metrics update automatically in real-time' },
      { type: 'numbered', text: 'Listen for audio alerts (if enabled in settings)' },
      { type: 'numbered', text: 'Red indicators mean alerts detected. Check only when safe' },
      {
        type: 'numbered',
        text: 'Tap the Record button again when finished. Data is saved automatically',
      },
      { type: 'numbered', text: 'Review your driving session in the Insights tab' },
    ],
  },
  {
    id: 'metrics-explained',
    title: 'Understanding Metrics',
    content: [
      {
        type: 'paragraph',
        text: 'Eyes: Tracks eye closure frequency and duration (EAR, PERCLOS). Detects drowsiness when eyes close frequently or for extended periods.',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Yawn: Detects yawning by analyzing mouth opening ratio (MAR). Frequent yawning indicates fatigue..',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Head: Monitors head orientation (yaw, pitch, roll) to detect when you look away from the road. Auto-calibrates at the start of each session. You can also manually recalibrate if you change your seating or camera position.',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Gaze: Tracks eye direction to detect when you are not looking forward at the road.',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Phone: Detects phone usage while driving using object detection.',
      },
    ],
  },
  {
    id: 'alerts-system',
    title: 'Alert System',
    content: [
      {
        type: 'bullet',
        text: 'There is a 5-second grace period after starting before alerts begin',
      },
      { type: 'bullet', text: 'Alerts use priority levels: Critical > High > Medium > Low' },
      { type: 'bullet', text: 'Each alert has a cooldown period to avoid repetition' },
      { type: 'bullet', text: 'Audio alerts can be toggled in Settings (speech + haptics)' },
      { type: 'bullet', text: 'Face not visible = Critical alert (highest priority)' },
      { type: 'bullet', text: 'Phone usage = Critical alert (immediate warning)' },
      { type: 'bullet', text: 'Frequent eye closure (PERCLOS) = High priority' },
      { type: 'bullet', text: 'Head pose and gaze off-road = Medium priority' },
      { type: 'bullet', text: 'Yawning = Low priority (triggered every 3 yawns)' },
    ],
  },
  {
    id: 'camera-setup',
    title: 'Camera Setup',
    content: [
      { type: 'bullet', text: 'Position at eye level or slightly above, centered on your face' },
      { type: 'bullet', text: 'Ensure good lighting. Avoid direct sunlight and backlighting' },
      { type: 'bullet', text: 'Keep your entire face visible in the frame' },
      { type: 'bullet', text: 'Ensure nothing obstructs your face' },
      { type: 'bullet', text: 'Clean the camera lens regularly for optimal detection' },
      { type: 'bullet', text: 'Use a stable mount to prevent camera shake' },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: [
      {
        type: 'paragraph',
        text: 'Connection issues: Check internet connection, restart app, verify server URL in Settings, avoid networks with firewalls',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Camera issues: Verify permissions in device settings, close other apps using the camera, restart the app',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Metrics not updating: Ensure face is fully visible and well-lit, remove sunglasses/masks, check for "Calibrating head pose" message',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'Battery: Keep device plugged in during long drives, check low battery warnings',
      },
      { type: 'spacer', text: '' },
      {
        type: 'paragraph',
        text: 'No audio alerts: Check Settings to enable speech/haptic alerts, verify device volume',
      },
    ],
  },
  {
    id: 'best-practices',
    title: 'Safety & Best Practices',
    important: true,
    content: [
      { type: 'bullet', text: 'NEVER interact with the app while driving. Set up before starting' },
      { type: 'bullet', text: 'Pull over safely if you need to check detailed metrics' },
      { type: 'bullet', text: 'Take breaks if you receive multiple fatigue alerts' },
      { type: 'bullet', text: 'Get adequate sleep before long drives' },
      { type: 'bullet', text: 'Stay hydrated and avoid heavy meals' },
      { type: 'bullet', text: 'The app assists but does not replace your responsibility' },
      { type: 'bullet', text: 'Trust your judgment. If you feel tired, stop driving' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    content: [
      { type: 'bullet', text: 'No data shared with third parties' },
      { type: 'bullet', text: 'Uses secure WebRTC connection with encrypted data channels' },
      { type: 'bullet', text: 'Video is analyzed in real-time but NEVER recorded or stored' },
      { type: 'bullet', text: 'Only metric statistics are stored locally on your device' },
      { type: 'bullet', text: 'You have full control. Delete data anytime' },
      { type: 'bullet', text: 'Session logging can be disabled in Settings' },
    ],
  },
];
