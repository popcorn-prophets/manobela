import { View, ActivityIndicator, ScrollView, Pressable, Image } from 'react-native';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { useSettings } from '@/hooks/useSettings';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import type { VideoFrameResult } from '@/types/video';
import {
  aggregateMetrics,
  averageFaceLandmarks,
  formatBytes,
  formatDuration,
  formatJsonFull,
  formatJsonPreview,
  mergeUniqueDetections,
  parseTimestampSeconds,
  pickThumbnail,
} from '@/utils/videoFormatter';

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

  const groupedFrames = useMemo(() => {
    if (!result?.frames?.length) return [];
    const buckets = new Map<number, VideoFrameResult[]>();
    for (const frame of result.frames) {
      const seconds = parseTimestampSeconds(frame.timestamp);
      const bucketIndex = seconds === null ? 0 : Math.floor(seconds / 5);
      const bucket = buckets.get(bucketIndex);
      if (bucket) {
        bucket.push(frame);
      } else {
        buckets.set(bucketIndex, [frame]);
      }
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([bucketIndex, frames]) => ({
        bucketIndex,
        startSec: bucketIndex * 5,
        endSec: bucketIndex * 5 + 5,
        frames,
        aggregate: {
          resolution: frames[0]?.resolution ?? null,
          face_landmarks: averageFaceLandmarks(frames),
          object_detections: mergeUniqueDetections(frames),
          metrics: aggregateMetrics(frames),
          thumbnail_base64: pickThumbnail(frames),
        },
      }));
  }, [result]);

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
          <Text className="text-sm text-muted-foreground">Upload progress: {uploadProgress}%</Text>
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
            <Text className="mt-3 font-semibold">Frame Results</Text>
            <Text className="text-xs text-muted-foreground">
              Grouped by 5-second windows. Each box shows the aggregate result for the interval.
            </Text>
            <View className="mt-2 gap-3">
              {groupedFrames.map((group) => (
                <View
                  key={`group-${group.bucketIndex}`}
                  className="rounded-md border border-border bg-muted/30 p-3">
                  <Pressable
                    onPress={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [group.bucketIndex]: !prev[group.bucketIndex],
                      }))
                    }
                    className="gap-1">
                    <Text className="text-sm font-semibold">
                      {group.startSec}s - {group.endSec}s
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Frames: {group.frames.length} -{' '}
                      {expandedGroups[group.bucketIndex] ? 'Hide details' : 'Show details'}
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
                    {expandedGroups[group.bucketIndex] ? (
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
