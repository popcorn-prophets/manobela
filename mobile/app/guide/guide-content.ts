export const GUIDE_SECTIONS = [
  {
    id: 'quick-start',
    title: 'Quick Start',
    content: [
      '1. Grant camera permissions when prompted',
      '2. Mount your device on the dashboard at eye level, ensuring your full face is visible',
      '3. Check connection status shows "Ready" or "Connected"',
      '4. Test while parked to ensure everything works',
    ],
  },
  {
    id: 'camera-tips',
    title: 'Camera Setup Tips',
    content: [
      '• Position camera at eye level or slightly above, centered on your face',
      '• Ensure good lighting—avoid backlighting and remove sunglasses',
      '• Keep your entire face visible in frame',
      '• Clean the camera lens regularly',
    ],
  },
  {
    id: 'metrics',
    title: 'What Each Metric Means',
    content: [
      ' Eyes: Tracks eye closure frequency and duration to detect fatigue (EAR, PERCLOS)',
      ' Yawn: Detects yawning as an indicator of drowsiness',
      ' Head: Monitors head orientation (yaw, pitch, roll) to detect looking away from the road',
      ' Gaze: Tracks eye direction to detect when you\'re not looking forward',
      ' Phone: Detects phone usage while driving',
    ],
  },
  {
    id: 'usage',
    title: 'Using During Drives',
    content: [
      '1. Set up and verify connection before driving',
      '2. Tap green "Start" button to begin monitoring',
      '3. Drive normally—metrics update automatically',
      '4. Red indicators mean alerts detected; check only when safe',
      '5. Tap "Stop" when finished; review results in Insights tab',
    ],
  },
  {
    id: 'understanding-results',
    title: 'Understanding Results',
    content: [
      '• Green/Gray = Normal | Red = Alert condition',
      '• Multiple simultaneous alerts suggest fatigue or distraction',
      '• High eye closure or yawning = drowsiness—take a break',
      '• Track patterns over time to improve driving habits',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: [
      'Connection issues: Check internet, restart app, avoid restricted networks',
      'Camera issues: Verify permissions, ensure no other app is using it',
      'Metrics not updating: Ensure face is visible and well-lit, remove sunglasses',
      'Keep device plugged in during long drives',
    ],
  },
  {
    id: 'best-practices',
    title: 'Best Practices & Safety',
    content: [
      '• Never interact with the app while driving—set up before starting',
      '• Pull over safely if you need to check metrics',
      '• Take breaks if multiple fatigue alerts appear',
      '• Get adequate sleep, avoid distractions, stay hydrated',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    content: [
      '• Video is analyzed in real-time but never recorded or stored',
      '• Only metric statistics are stored locally on your device',
      '• Secure encrypted connection; no data shared with third parties',
      '• You control monitoring and can delete data anytime',
    ],
  },
] as const;
