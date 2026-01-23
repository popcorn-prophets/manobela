import { View, ActivityIndicator, Alert, ScrollView, Pressable, Image } from 'react-native';

import { useMemo, useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { useSettings } from '@/hooks/useSettings';

type SelectedVideo = {
  uri: string;
  name: string;
  sizeBytes: number;
  durationMs?: number;
  mimeType: string;
};

type VideoProcessingResponse = {
  video_metadata: {
    duration_sec: number;
    total_frames_processed: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  frames: VideoFrameResult[];
};

type VideoFrameResult = {
  timestamp: string;
  frame_number: number;
  resolution: { width: number; height: number };
  face_landmarks: number[] | null;
  object_detections: ObjectDetection[] | null;
  metrics: Record<string, unknown> | null;
  thumbnail_base64: string | null;
};

type ObjectDetection = {
  bbox: number[];
  conf: number;
  class_id: number;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
};

const formatDuration = (durationMs?: number) => {
  if (!durationMs) return 'Unknown';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatJsonPreview = (value: unknown, maxLength = 240) => {
  if (value === null || value === undefined) return 'null';
  const json = JSON.stringify(value);
  if (!json) return 'null';
  if (json.length <= maxLength) return json;
  return `${json.slice(0, maxLength)}...`;
};

const formatJsonFull = (value: unknown) => {
  if (value === null || value === undefined) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'null';
  }
};

const parseTimestampSeconds = (timestamp: string) => {
  const match = timestamp.match(/^(\d+):(\d+):(\d+)\.(\d{1,3})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4].padEnd(3, '0'));
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
};

const averageFaceLandmarks = (frames: VideoFrameResult[]) => {
  const landmarks = frames
    .map((frame) => frame.face_landmarks)
    .filter((value): value is number[] => Array.isArray(value) && value.length > 0);
  if (!landmarks.length) return null;
  const length = landmarks[0].length;
  const totals = new Array<number>(length).fill(0);
  let count = 0;
  for (const frameLandmarks of landmarks) {
    if (frameLandmarks.length !== length) {
      continue;
    }
    for (let index = 0; index < length; index += 1) {
      totals[index] += frameLandmarks[index];
    }
    count += 1;
  }
  if (!count) return null;
  return totals.map((value) => value / count);
};

const mergeUniqueDetections = (frames: VideoFrameResult[]) => {
  const detections = frames
    .map((frame) => frame.object_detections)
    .filter((value): value is ObjectDetection[] => Array.isArray(value) && value.length > 0)
    .flat();
  if (!detections.length) return null;
  const unique = new Map<string, ObjectDetection>();
  for (const detection of detections) {
    const bboxKey = detection.bbox.map((value) => value.toFixed(3)).join(',');
    const key = `${detection.class_id}:${bboxKey}`;
    const existing = unique.get(key);
    if (!existing || detection.conf > existing.conf) {
      unique.set(key, detection);
    }
  }
  return Array.from(unique.values());
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const aggregateBoolean = (values: boolean[]) => {
  if (values.some(Boolean)) return true;
  return values[values.length - 1] ?? false;
};

const aggregateNumericArray = (values: number[][]) => {
  if (!values.length) return null;
  const length = values[0].length;
  const totals = new Array<number>(length).fill(0);
  let count = 0;
  for (const arr of values) {
    if (arr.length !== length) continue;
    for (let index = 0; index < length; index += 1) {
      totals[index] += arr[index];
    }
    count += 1;
  }
  if (!count) return null;
  return totals.map((value) => value / count);
};

const aggregateMetricsObject = (objects: Record<string, unknown>[]) => {
  if (!objects.length) return null;
  const result: Record<string, unknown> = {};
  const keys = new Set<string>();
  for (const obj of objects) {
    Object.keys(obj).forEach((key) => keys.add(key));
  }
  for (const key of keys) {
    const values = objects.map((obj) => obj[key]).filter((value) => value !== undefined);
    if (!values.length) {
      continue;
    }
    if (key.endsWith('_alert')) {
      const bools = values.filter((value): value is boolean => typeof value === 'boolean');
      result[key] = bools.length ? aggregateBoolean(bools) : values[values.length - 1];
      continue;
    }
    const numbers = values.filter((value): value is number => typeof value === 'number');
    if (numbers.length === values.length) {
      result[key] = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      continue;
    }
    const booleans = values.filter((value): value is boolean => typeof value === 'boolean');
    if (booleans.length === values.length) {
      result[key] = aggregateBoolean(booleans);
      continue;
    }
    const arrays = values.filter(
      (value): value is number[] =>
        Array.isArray(value) && value.every((item) => typeof item === 'number')
    );
    if (arrays.length === values.length) {
      result[key] = aggregateNumericArray(arrays);
      continue;
    }
    const objectsValues = values.filter(isPlainObject);
    if (objectsValues.length === values.length) {
      result[key] = aggregateMetricsObject(objectsValues);
      continue;
    }
    result[key] = values[values.length - 1];
  }
  return result;
};

const aggregateMetrics = (frames: VideoFrameResult[]) => {
  const metricsList = frames
    .map((frame) => frame.metrics)
    .filter((value): value is Record<string, unknown> => isPlainObject(value));
  if (!metricsList.length) return null;
  return aggregateMetricsObject(metricsList);
};

const pickThumbnail = (frames: VideoFrameResult[]) =>
  frames.find((frame) => frame.thumbnail_base64)?.thumbnail_base64 ?? null;

export default function UploadsScreen() {
  const { settings } = useSettings();
  const apiBaseUrl = useMemo(
    () => settings.apiBaseUrl.trim().replace(/\/$/, ''),
    [settings.apiBaseUrl]
  );

  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoProcessingResponse | null>(null);
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

  const handleSelectVideo = async () => {
    setError(null);
    setResult(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library.');
      return;
    }

    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (selection.canceled || !selection.assets?.length) {
      return;
    }

    const asset = selection.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload.mp4';
    const info = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes = asset.fileSize ?? (info.exists ? (info.size ?? 0) : 0);
    const durationMs = asset.duration ?? undefined;
    const mimeType = asset.mimeType ?? 'video/mp4';

    setSelectedVideo({
      uri: asset.uri,
      name,
      sizeBytes,
      durationMs,
      mimeType,
    });
  };

  const handleUpload = () => {
    if (!selectedVideo) return;
    if (!apiBaseUrl) {
      Alert.alert('Missing API URL', 'Configure your API base URL in Settings.');
      return;
    }

    setIsUploading(true);
    setIsProcessing(false);
    setUploadProgress(0);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('video', {
      uri: selectedVideo.uri,
      name: selectedVideo.name,
      type: selectedVideo.mimeType,
    } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/driver-monitoring/process-video`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      const clampedProgress = Math.min(100, Math.max(0, progress));
      setUploadProgress(clampedProgress);
      if (clampedProgress >= 100) {
        setIsProcessing(true);
      }
    };

    xhr.upload.onload = () => {
      setIsProcessing(true);
    };

    xhr.onload = () => {
      setIsUploading(false);
      setIsProcessing(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as VideoProcessingResponse;
          setResult(parsed);
        } catch {
          setError('Upload succeeded but response could not be parsed.');
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText) as { detail?: string };
          setError(parsed.detail ?? 'Upload failed. Please try again.');
        } catch {
          setError('Upload failed. Please try again.');
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setIsProcessing(false);
      setError('Upload failed. Please check your connection.');
    };

    xhr.send(formData);
  };

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

