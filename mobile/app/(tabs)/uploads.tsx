import { View, ActivityIndicator, ScrollView, Pressable, Image, StyleSheet } from 'react-native';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { FacialLandmarkOverlay } from '@/components/facial-landmark-overlay';
import { ObjectDetectionOverlay } from '@/components/object-detection-overlay';

import { useSettings } from '@/hooks/useSettings';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import {
  formatBytes,
  formatDuration,
  formatJsonFull,
  formatJsonPreview,
  parseTimestampSeconds,
} from '@/utils/videoFormatter';
import type { ObjectDetection } from '@/types/inference';
import type { VideoFrameResult } from '@/types/video';

type FrameWithTimestamp = VideoFrameResult & { timestampSec: number };
type OverlaySnapshot = {
  landmarks: number[] | null;
  detections: ObjectDetection[] | null;
  resolution: { width: number; height: number } | null;
  atMs: number;
};

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
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [playbackDurationMs, setPlaybackDurationMs] = useState<number | null>(null);
  const [playbackView, setPlaybackView] = useState({ width: 0, height: 0 });
  const [showOverlays, setShowOverlays] = useState(true);
  const [overlaySnapshot, setOverlaySnapshot] = useState<OverlaySnapshot | null>(null);

  const groups = useMemo(() => result?.groups ?? [], [result]);
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.start_sec - b.start_sec),
    [groups]
  );
  const framesWithTime = useMemo<FrameWithTimestamp[]>(() => {
    if (!result?.frames?.length) return [];
    return result.frames
      .map((frame) => {
        const timestampSec = parseTimestampSeconds(frame.timestamp);
        if (timestampSec === null) return null;
        return { ...frame, timestampSec };
      })
      .filter((frame): frame is FrameWithTimestamp => frame !== null)
      .sort((a, b) => a.timestampSec - b.timestampSec);
  }, [result?.frames]);

  useEffect(() => {
    setPlaybackPositionMs(0);
    setPlaybackDurationMs(null);
    setOverlaySnapshot(null);
  }, [selectedVideo?.uri]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPlaybackPositionMs(status.positionMillis ?? 0);
    if (status.durationMillis != null) {
      setPlaybackDurationMs(status.durationMillis);
    }
  }, []);

  const playbackAspectRatio = useMemo(() => {
    const width = result?.video_metadata?.resolution?.width ?? 16;
    const height = result?.video_metadata?.resolution?.height ?? 9;
    if (height <= 0) return 16 / 9;
    return width / height;
  }, [result?.video_metadata?.resolution?.width, result?.video_metadata?.resolution?.height]);

  const playbackSeconds = playbackPositionMs / 1000;
  const activeGroup = useMemo(() => {
    if (sortedGroups.length === 0) return null;
    const match = sortedGroups.find(
      (group) => playbackSeconds >= group.start_sec && playbackSeconds < group.end_sec
    );
    if (match) return match;
    if (playbackSeconds < sortedGroups[0].start_sec) return sortedGroups[0];
    return sortedGroups[sortedGroups.length - 1];
  }, [playbackSeconds, sortedGroups]);

  const activeFrame = useMemo<FrameWithTimestamp | null>(() => {
    if (framesWithTime.length === 0) return null;
    const index = findFrameIndex(framesWithTime, playbackSeconds);
    return index === null ? null : framesWithTime[index];
  }, [framesWithTime, playbackSeconds]);

  useEffect(() => {
    const HOLD_MS = 450;

    if (!showOverlays || !activeFrame) {
      setOverlaySnapshot(null);
      return;
    }

    const hasLandmarks = Boolean(activeFrame.face_landmarks?.length);
    const hasDetections = Boolean(activeFrame.object_detections?.length);

    if (hasLandmarks || hasDetections) {
      setOverlaySnapshot({
        landmarks: activeFrame.face_landmarks ?? null,
        detections: activeFrame.object_detections ?? null,
        resolution: activeFrame.resolution ?? null,
        atMs: playbackPositionMs,
      });
      return;
    }

    setOverlaySnapshot((prev) => {
      if (!prev) return null;
      const delta = playbackPositionMs - prev.atMs;
      if (delta < 0) return null;
      if (delta <= HOLD_MS) return prev;
      return null;
    });
  }, [activeFrame, playbackPositionMs, showOverlays]);

  const fallbackLandmarks = activeGroup?.aggregate.face_landmarks ?? null;
  const fallbackDetections = activeGroup?.aggregate.object_detections ?? null;

  const overlayResolution =
    overlaySnapshot?.resolution ??
    activeFrame?.resolution ??
    activeGroup?.aggregate.resolution ??
    result?.video_metadata?.resolution ??
    null;
  const overlayLandmarks = showOverlays ? overlaySnapshot?.landmarks ?? fallbackLandmarks : null;
  const overlayDetections = showOverlays ? overlaySnapshot?.detections ?? fallbackDetections : null;
  const canRenderOverlay =
    Boolean(overlayResolution) && playbackView.width > 0 && playbackView.height > 0;
  const hasOverlayData =
    Boolean(overlayLandmarks?.length) || Boolean(overlayDetections?.length);

  const totalDurationMs =
    playbackDurationMs ??
    (result?.video_metadata?.duration_sec
      ? Math.round(result.video_metadata.duration_sec * 1000)
      : null);
  const groupIntervalSec =
    sortedGroups.length > 0 ? Math.round(sortedGroups[0].end_sec - sortedGroups[0].start_sec) : 0;

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
          <Text className="text-sm text-muted-foreground">
            Upload progress: {uploadProgress}%
          </Text>
        ) : null}

        {isProcessing ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator />
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
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowOverlays((prev) => !prev)}>
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
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setPlaybackView({ width, height });
                }}>
                {selectedVideo ? (
                  <Video
                    source={{ uri: selectedVideo.uri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    progressUpdateIntervalMillis={100}
                    onPlaybackStatusUpdate={handlePlaybackStatus}
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

const formatPlaybackTime = (durationMs: number | null) => {
  if (durationMs === null || Number.isNaN(durationMs)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const findFrameIndex = (frames: FrameWithTimestamp[], timeSec: number) => {
  if (frames.length === 0) return null;

  if (timeSec <= frames[0].timestampSec) return 0;
  const lastIndex = frames.length - 1;
  if (timeSec >= frames[lastIndex].timestampSec) return lastIndex;

  let low = 0;
  let high = lastIndex;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const current = frames[mid].timestampSec;

    if (current === timeSec) return mid;
    if (current < timeSec) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const afterIndex = Math.min(lastIndex, Math.max(0, low));
  const beforeIndex = Math.min(lastIndex, Math.max(0, high));
  const afterDiff = Math.abs(frames[afterIndex].timestampSec - timeSec);
  const beforeDiff = Math.abs(timeSec - frames[beforeIndex].timestampSec);

  return afterDiff <= beforeDiff ? afterIndex : beforeIndex;
};
