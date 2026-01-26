import React, { useEffect, useRef, useState } from 'react';
import { MediaStream, RTCView } from 'react-native-webrtc';
import { SessionState } from '@/hooks/useMonitoringSession';
import { CameraRecordButton } from './camera-record-button';
import { FacialLandmarkOverlay } from './facial-landmark-overlay';
import { ObjectDetectionOverlay } from './object-detection-overlay';
import { InferenceData, ObjectDetection } from '@/types/inference';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Eye, EyeOff, Frown, Meh, ScanFace } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';

type MediaStreamViewProps = {
  stream: MediaStream | null;
  sessionState: SessionState;
  sessionDurationMs?: number;
  inferenceData?: InferenceData | null;
  style?: object;
  mirror?: boolean;
  hasCamera: boolean;
  onToggle: () => void;
  onRecalibrateHeadPose?: () => void;
  recalibrateEnabled?: boolean;
};

/**
 * Displays a MediaStream (camera view) with optional overlay.
 */
export const MediaStreamView = ({
  stream,
  sessionState,
  sessionDurationMs = 0,
  inferenceData,
  style,
  mirror = true,
  hasCamera,
  onToggle,
  onRecalibrateHeadPose,
  recalibrateEnabled = true,
}: MediaStreamViewProps) => {
  const { colors } = useTheme();

  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  const [showOverlay, setShowOverlay] = useState(true);
  const [smoothedDetections, setSmoothedDetections] = useState<
    ObjectDetection[] | null
  >(null);
  const lastDetectionsRef = useRef<ObjectDetection[] | null>(null);
  const lastDetectionAtRef = useRef<number | null>(null);

  const landmarks = inferenceData?.face_landmarks || null;
  const objectDetections = inferenceData?.object_detections || null;
  const videoWidth = inferenceData?.resolution?.width || 480;
  const videoHeight = inferenceData?.resolution?.height || 320;
  const frameTick = inferenceData?.timestamp ?? null;

  useEffect(() => {
    const HOLD_MS = 500;

    if (sessionState !== 'active') {
      lastDetectionsRef.current = null;
      lastDetectionAtRef.current = null;
      setSmoothedDetections(null);
      return;
    }

    if (objectDetections && objectDetections.length > 0) {
      lastDetectionsRef.current = objectDetections;
      lastDetectionAtRef.current = Date.now();
      setSmoothedDetections(objectDetections);
      return;
    }

    const lastAt = lastDetectionAtRef.current;
    if (lastAt === null) {
      setSmoothedDetections(null);
      return;
    }

    if (Date.now() - lastAt <= HOLD_MS) {
      setSmoothedDetections(lastDetectionsRef.current);
      return;
    }

    lastDetectionsRef.current = null;
    lastDetectionAtRef.current = null;
    setSmoothedDetections(null);
  }, [frameTick, objectDetections, sessionState]);

  // Determine whether to show landmarks
  const showOverlays =
    inferenceData &&
    showOverlay &&
    sessionState === 'active' &&
    viewDimensions.width > 0 &&
    viewDimensions.height > 0;

  const showLandmarks = showOverlays && landmarks != null;
  const showDetections = showOverlays && smoothedDetections != null;
  const formattedDuration = formatDuration(sessionDurationMs);
  const canRecalibrate = sessionState === 'active' && Boolean(onRecalibrateHeadPose);
  const recalibrateActive = canRecalibrate && recalibrateEnabled;

  if (!stream) return null;

  return (
    <View
      style={[
        { width: '100%', height: '100%', flex: 1, borderRadius: 16, overflow: 'hidden' },
        style,
      ]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewDimensions({ width, height });
      }}>
      <RTCView
        streamURL={stream.toURL()}
        objectFit="cover"
        style={StyleSheet.absoluteFill}
        mirror={mirror}
      />

      {showLandmarks && (
        <FacialLandmarkOverlay
          landmarks={landmarks}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          viewWidth={viewDimensions.width}
          viewHeight={viewDimensions.height}
          mirror={mirror}
        />
      )}

      {showDetections && (
        <ObjectDetectionOverlay
          detections={smoothedDetections}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          viewWidth={viewDimensions.width}
          viewHeight={viewDimensions.height}
          mirror={mirror}
        />
      )}

      {/* Overlay record button */}
      <View className="absolute bottom-3 left-0 right-0 items-center">
        <CameraRecordButton
          isRecording={sessionState === 'active'}
          disabled={!hasCamera || sessionState === 'starting' || sessionState === 'stopping'}
          onPress={onToggle}
        />
      </View>

      {canRecalibrate && (
        <Pressable
          onPress={onRecalibrateHeadPose}
          accessibilityRole="button"
          accessibilityLabel="Recalibrate head pose"
          accessibilityState={{ disabled: !recalibrateActive }}
          disabled={!recalibrateActive}
          style={[styles.recalibrateButton, !recalibrateActive && styles.recalibrateDisabled]}>
          <View style={styles.recalibrateRing}>
            <ScanFace size={22} color="white" />
          </View>
        </Pressable>
      )}

      {/* Top overlay */}
      <View className="absolute left-0 right-0 top-3 z-10 flex-row items-center justify-between px-3">
        <View className="h-9 w-9 items-center justify-center">
          {sessionState !== 'active' ? (
            <Meh size={24} color="white" />
          ) : inferenceData?.metrics?.face_missing ? (
            <Frown size={24} color={colors.destructive} />
          ) : (
            <ScanFace size={24} color="white" />
          )}
        </View>

        <View className="items-center justify-center">
          {sessionState === 'active' && (
            <View className="mb-1 flex-row items-center rounded-full bg-black/40 px-2 py-1">
              <View className="mr-1 h-2 w-2 rounded-full bg-red-500" />
              <Text className="text-xs text-white">{formattedDuration}</Text>
            </View>
          )}
          {inferenceData?.resolution && (
            <View className="rounded-full bg-black/40 px-2 py-1">
              <Text className="text-xs text-white">
                {inferenceData.resolution.width}x{inferenceData.resolution.height}
              </Text>
            </View>
          )}
        </View>

        <View className="h-9 w-9 items-center justify-center">
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showOverlay ? 'Hide overlays' : 'Show overlays'}
            onPress={() => setShowOverlay((v) => !v)}
            className="h-9 w-9 items-center justify-center">
            {showOverlay ? <Eye size={24} color="white" /> : <EyeOff size={24} color="white" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
// This can be transfered to components, but too lazy
const styles = StyleSheet.create({
  recalibrateButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recalibrateRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  recalibrateDisabled: {
    opacity: 0.45,
  },
});
