import { View, ScrollView } from 'react-native';
import { useMemo, useState } from 'react';
import { useVideoPlayer } from 'expo-video';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SpinningLogo } from '@/components/spinning-logo';
import { useSettings } from '@/hooks/useSettings';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useUploadPlayback } from '@/hooks/useUploadPlayback';
import { formatBytes, formatDuration } from '@/utils/videoFormatter';
import { FileVideoCamera, UploadCloud } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { UploadPlayback } from '@/components/upload-playback';
import { MetricsDisplay } from '@/components/metrics/metrics-display';
import { SessionState } from '@/hooks/useMonitoringSession';
import { MetricsOutput } from '@/types/metrics';

const BIG_FILE_SIZE_MB = 50;

export default function UploadsScreen() {
  const { colors } = useTheme();

  const { settings } = useSettings();
  const apiBaseUrl = useMemo(
    () => settings.apiBaseUrl.trim().replace(/\/$/, ''),
    [settings.apiBaseUrl]
  );

  const {
    selectedVideo,
    uploadProgress,
    isUploading,
    isProcessing,
    error,
    result,
    handleSelectVideo,
    handleUpload,
  } = useVideoUpload(apiBaseUrl);

  const [showOverlays, setShowOverlays] = useState(true);
  const player = useVideoPlayer(selectedVideo?.uri ?? null, (player) => {
    player.timeUpdateEventInterval = 0.05;
  });
  const {
    playbackAspectRatio,
    playbackView,
    handlePlaybackLayout,
    overlayLandmarks,
    overlayDetections,
    canRenderOverlay,
    activeFrame,
    videoWidth,
    videoHeight,
  } = useUploadPlayback({
    result,
    selectedVideoUri: selectedVideo?.uri,
    showOverlays,
    player,
    holdMs: 200,
  });

  // Determine session state for metrics display
  // Show as active whenever we have processed results, not just when playing
  const sessionState: SessionState = useMemo(() => {
    if (isUploading || isProcessing) return 'starting';
    // Keep metrics active as long as we have result data
    if (result) return 'active';
    return 'idle';
  }, [isUploading, isProcessing, result]);

  // Get current metrics from active playback frame
  const currentMetrics = useMemo(() => {
    if (activeFrame?.metrics) {
      return activeFrame.metrics as unknown as MetricsOutput;
    }
    // Fallback to first frame if available
    if (result?.frames?.length && result.frames[0]?.metrics) {
      return result.frames[0].metrics as unknown as MetricsOutput;
    }
    return null;
  }, [activeFrame, result]);

  return (
    <ScrollView className="flex-1 px-2 py-1" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="gap-3">
        {result && (
          <>
            <UploadPlayback
              selectedVideoUri={selectedVideo?.uri}
              player={player}
              playbackAspectRatio={playbackAspectRatio}
              playbackView={playbackView}
              handlePlaybackLayout={handlePlaybackLayout}
              overlayLandmarks={overlayLandmarks}
              overlayDetections={overlayDetections}
              canRenderOverlay={canRenderOverlay}
              showOverlays={showOverlays}
              onToggleOverlays={setShowOverlays}
              faceMissing={
                (currentMetrics as unknown as { face_missing?: boolean })?.face_missing ?? false
              }
              videoWidth={videoWidth}
              videoHeight={videoHeight}
            />

            <MetricsDisplay sessionState={sessionState} metricsOutput={currentMetrics} />
          </>
        )}

        <Button onPress={handleSelectVideo} variant="secondary">
          <FileVideoCamera color={colors.primary} size={18} />
          <Text>Select Video</Text>
        </Button>

        {selectedVideo ? (
          <View className="rounded-md border border-border bg-muted/40 p-3">
            <Text className="text-sm font-semibold">{selectedVideo.name}</Text>
            <View className="flex flex-row gap-3">
              <Text className="text-xs text-muted-foreground">
                Duration: {formatDuration(selectedVideo.durationMs)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                Size: {formatBytes(selectedVideo.sizeBytes)}
              </Text>
            </View>
            {selectedVideo.sizeBytes > BIG_FILE_SIZE_MB * 1024 * 1024 ? (
              <Text className="mt-1 text-xs text-amber-600">
                Large file detected. Consider compressing for faster uploads.
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-xs text-muted-foreground">
            Upload a recorded drive to check its metrics just like you would in a live session.
          </Text>
        )}

        <Button onPress={handleUpload} disabled={!selectedVideo || isUploading || isProcessing}>
          <UploadCloud color={colors.background} size={18} />
          <Text>{isUploading ? 'Uploading...' : 'Upload & Analyze'}</Text>
        </Button>

        {isUploading ? (
          <View className="flex-row items-center gap-2">
            <SpinningLogo width={20} height={20} />
            <Text className="text-sm text-muted-foreground">
              Upload progress: {uploadProgress}%
            </Text>
          </View>
        ) : null}

        {isProcessing ? (
          <View className="flex-row items-center gap-2">
            <SpinningLogo width={20} height={20} />
            <Text className="text-sm text-muted-foreground">
              Upload complete. Processing video frames...
            </Text>
          </View>
        ) : null}

        {error ? <Text className="text-sm text-destructive">Error: {error}</Text> : null}

        {result && (
          <View className="flex flex-row gap-3 rounded-md border border-border bg-muted/40 p-2">
            <Text className="text-xs text-muted-foreground">
              Frames Processed: {result.video_metadata.total_frames_processed}
            </Text>
            <Text className="text-xs text-muted-foreground">FPS: {result.video_metadata.fps}</Text>
            <Text className="text-xs text-muted-foreground">
              Resolution: {result.video_metadata.resolution.width}x
              {result.video_metadata.resolution.height}
            </Text>
          </View>
        )}

        {/* Spacer to avoid content being hidden behind bottom navigation */}
        <View className="h-16" />
      </View>
    </ScrollView>
  );
}
