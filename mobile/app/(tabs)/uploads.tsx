import { View, ScrollView, Pressable, Image, StyleSheet } from 'react-native';

import { useEffect, useMemo, useState } from 'react';
import { VideoView, createVideoPlayer } from 'expo-video';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { FacialLandmarkOverlay } from '@/components/facial-landmark-overlay';
import { ObjectDetectionOverlay } from '@/components/object-detection-overlay';
import { SpinningLogo } from '@/components/spinning-logo';

import { useSettings } from '@/hooks/useSettings';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useUploadPlayback } from '@/hooks/useUploadPlayback';
import {
  formatBytes,
  formatDuration,
  formatJsonFull,
  formatJsonPreview,
} from '@/utils/videoFormatter';
import { formatPlaybackTime } from '@/utils/uploadPlayback';

export default function UploadsScreen() {
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

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [showOverlays, setShowOverlays] = useState(true);
  const player = useMemo(() => createVideoPlayer(null), []);
  useEffect(() => {
    player.timeUpdateEventInterval = 0.05;
    return () => {
      player.release();
    };
  }, [player]);
  useEffect(() => {
    void player.replaceAsync(selectedVideo?.uri ?? null);
  }, [player, selectedVideo?.uri]);
  const {
    groups,
    activeGroup,
    playbackAspectRatio,
    playbackPositionMs,
    totalDurationMs,
    playbackView,
    handlePlaybackLayout,
    overlayLandmarks,
    overlayDetections,
    overlayResolution,
    canRenderOverlay,
    hasOverlayData,
    groupIntervalSec,
  } = useUploadPlayback({
    result,
    selectedVideoUri: selectedVideo?.uri,
    showOverlays,
    player,
    holdMs: 200,
  });

  return (
    <ScrollView className="flex-1 px-4 py-6">
      <Text variant="h3" className="mb-2">
        Uploads
      </Text>
      <Text className="text-sm text-muted-foreground">
        Upload a recorded drive to run the same monitoring metrics as a live session.
      </Text>

      <View className="mt-6 gap-3">
        <Button onPress={handleSelectVideo} variant="secondary">
          <Text>Select Video</Text>
        </Button>

        {selectedVideo ? (
          <View className="rounded-md border border-border bg-muted/40 p-4">
            <Text className="font-semibold">{selectedVideo.name}</Text>
            <Text className="text-sm text-muted-foreground">
              Duration: {formatDuration(selectedVideo.durationMs)}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Size: {formatBytes(selectedVideo.sizeBytes)}
            </Text>
            {selectedVideo.sizeBytes > 50 * 1024 * 1024 ? (
              <Text className="mt-1 text-sm text-amber-500">
                Large file detected. Consider compressing for faster uploads.
              </Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-sm text-muted-foreground">
            No video selected yet. Choose one to preview details before uploading.
          </Text>
        )}

        <Button onPress={handleUpload} disabled={!selectedVideo || isUploading}>
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

        {result ? (
          <View className="rounded-md border border-border bg-background p-4">
            <Text className="font-semibold">Processing Summary</Text>
            <Text className="text-sm text-muted-foreground">
              Duration: {result.video_metadata.duration_sec.toFixed(1)}s
            </Text>
            <Text className="text-sm text-muted-foreground">
              Frames processed: {result.video_metadata.total_frames_processed}
            </Text>
            <Text className="text-sm text-muted-foreground">FPS: {result.video_metadata.fps}</Text>
            <Text className="text-sm text-muted-foreground">
              Resolution: {result.video_metadata.resolution.width} x{' '}
              {result.video_metadata.resolution.height}
            </Text>
            <View className="mt-4 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold">Playback</Text>
                <Button variant="ghost" size="sm" onPress={() => setShowOverlays((prev) => !prev)}>
                  <Text>{showOverlays ? 'Hide overlays' : 'Show overlays'}</Text>
                </Button>
              </View>
              <Text className="text-xs text-muted-foreground">
                {result.video_metadata.fps
                  ? `Overlays sampled at ${result.video_metadata.fps} fps.`
                  : 'Overlays sampled per frame.'}
              </Text>
              <View
                className="relative overflow-hidden rounded-md border border-border bg-black"
                style={{ width: '100%', aspectRatio: playbackAspectRatio }}
                onLayout={handlePlaybackLayout}>
                {selectedVideo ? (
                  <VideoView
                    player={player}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    nativeControls
                  />
                ) : null}
                {canRenderOverlay ? (
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    {overlayLandmarks ? (
                      <FacialLandmarkOverlay
                        landmarks={overlayLandmarks}
                        videoWidth={overlayResolution?.width ?? 0}
                        videoHeight={overlayResolution?.height ?? 0}
                        viewWidth={playbackView.width}
                        viewHeight={playbackView.height}
                        mirror={false}
                      />
                    ) : null}
                    {overlayDetections ? (
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
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  {formatPlaybackTime(playbackPositionMs)}
                  {totalDurationMs != null ? ` / ${formatPlaybackTime(totalDurationMs)}` : ''}
                </Text>
                {activeGroup ? (
                  <Text className="text-xs text-muted-foreground">
                    Window {formatPlaybackTime(activeGroup.start_sec * 1000)} -{' '}
                    {formatPlaybackTime(activeGroup.end_sec * 1000)}
                  </Text>
                ) : null}
              </View>
              {!hasOverlayData ? (
                <Text className="text-xs text-muted-foreground">
                  No overlay data available for this frame.
                </Text>
              ) : null}
            </View>
            <Text className="mt-3 font-semibold">Frame Results</Text>
            <Text className="text-xs text-muted-foreground">
              {groupIntervalSec > 0
                ? `Grouped by ${groupIntervalSec}-second windows.`
                : 'Grouped by time windows.'}{' '}
              Each box shows the aggregate result for the interval.
            </Text>
            <View className="mt-2 gap-3">
              {groups.map((group) => (
                <View
                  key={`group-${group.bucket_index}`}
                  className="rounded-md border border-border bg-muted/30 p-3">
                  <Pressable
                    onPress={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [group.bucket_index]: !prev[group.bucket_index],
                      }))
                    }
                    className="gap-1">
                    <Text className="text-sm font-semibold">
                      {Math.floor(group.start_sec)}s - {Math.floor(group.end_sec)}s
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Frames: {group.frame_count} -{' '}
                      {expandedGroups[group.bucket_index] ? 'Hide details' : 'Show details'}
                    </Text>
                  </Pressable>
                  <View className="mt-2 gap-1">
                    <Text className="text-xs text-muted-foreground">
                      Resolution:{' '}
                      {group.aggregate.resolution
                        ? `${group.aggregate.resolution.width} x ${group.aggregate.resolution.height}`
                        : 'Unknown'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Face landmarks: {group.aggregate.face_landmarks ? 'averaged' : 'null'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Object detections:{' '}
                      {group.aggregate.object_detections
                        ? `${group.aggregate.object_detections.length} unique`
                        : 'null'}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Metrics: {formatJsonPreview(group.aggregate.metrics)}
                    </Text>
                    {expandedGroups[group.bucket_index] ? (
                      <View className="mt-2 gap-2">
                        {group.aggregate.thumbnail_base64 ? (
                          <Image
                            source={{
                              uri: `data:image/jpeg;base64,${group.aggregate.thumbnail_base64}`,
                            }}
                            className="h-40 w-full rounded-md"
                            resizeMode="cover"
                          />
                        ) : null}
                        <Text className="font-mono text-xs text-muted-foreground">
                          Metrics (full):{'\n'}
                          {formatJsonFull(group.aggregate.metrics)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
