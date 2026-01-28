import { View, StyleSheet } from 'react-native';
import { VideoView } from 'expo-video';
import { FacialLandmarkOverlay } from '@/components/facial-landmark-overlay';
import { ObjectDetectionOverlay } from '@/components/object-detection-overlay';
import { OverlayToggleButton } from '@/components/overlay-toggle-button';
import { FaceMissingIndicator } from '@/components/face-missing-indicator';

interface UploadPlaybackProps {
  result: {
    video_metadata: {
      fps: number;
      resolution: { width: number; height: number };
    };
  };
  selectedVideoUri?: string;
  player: any;
  playbackAspectRatio: number;
  playbackView: { width: number; height: number };
  handlePlaybackLayout: (event: any) => void;
  overlayLandmarks?: unknown;
  overlayDetections?: unknown;
  overlayResolution?: { width: number; height: number } | null;
  canRenderOverlay: boolean;
  hasOverlayData: boolean;
  showOverlays: boolean;
  onToggleOverlays: (show: boolean) => void;
  faceMissing?: boolean;
}

export function UploadPlayback({
  result,
  selectedVideoUri,
  player,
  playbackAspectRatio,
  playbackView,
  handlePlaybackLayout,
  overlayLandmarks,
  overlayDetections,
  overlayResolution,
  canRenderOverlay,
  hasOverlayData,
  showOverlays,
  onToggleOverlays,
  faceMissing = false,
}: UploadPlaybackProps) {
  return (
    <View
      className="relative overflow-hidden rounded-md border border-border bg-black"
      style={{ width: '100%', aspectRatio: playbackAspectRatio }}
      onLayout={handlePlaybackLayout}>
      {selectedVideoUri ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls
        />
      ) : null}
      {canRenderOverlay ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {overlayLandmarks && Array.isArray(overlayLandmarks) ? (
            <FacialLandmarkOverlay
              landmarks={overlayLandmarks}
              videoWidth={overlayResolution?.width ?? 0}
              videoHeight={overlayResolution?.height ?? 0}
              viewWidth={playbackView.width}
              viewHeight={playbackView.height}
              mirror={false}
            />
          ) : null}
          {overlayDetections && Array.isArray(overlayDetections) ? (
            <ObjectDetectionOverlay
              detections={overlayDetections}
              videoWidth={overlayResolution?.width ?? 0}
              videoHeight={overlayResolution?.height ?? 0}
              viewWidth={playbackView.width}
              viewHeight={playbackView.height}
              mirror={false}
            />
          ) : null}
        </View>
      ) : null}

      {/* Top overlay with indicators */}
      <View className="absolute left-0 right-0 top-3 z-10 flex-row items-center justify-between px-4">
        {/* Overlay toggle */}
        <OverlayToggleButton
          showOverlay={showOverlays}
          onToggle={() => onToggleOverlays(!showOverlays)}
          color="white"
        />

        {/* Face missing indicator */}
        <FaceMissingIndicator isActive={true} faceMissing={faceMissing} />
      </View>
    </View>
  );
}
