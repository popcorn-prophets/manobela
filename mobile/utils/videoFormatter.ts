import type { VideoFrameResult } from '@/types/video';
import type { ObjectDetection } from '@/types/inference';

export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
};

export const formatDuration = (durationMs?: number) => {
  if (!durationMs) return 'Unknown';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatJsonPreview = (value: unknown, maxLength = 240) => {
  if (value === null || value === undefined) return 'null';
  const json = JSON.stringify(value);
  if (!json) return 'null';
  if (json.length <= maxLength) return json;
  return `${json.slice(0, maxLength)}...`;
};

export const formatJsonFull = (value: unknown) => {
  if (value === null || value === undefined) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'null';
  }
};

export const parseTimestampSeconds = (timestamp: string) => {
  const match = timestamp.match(/^(\d+):(\d+):(\d+)\.(\d{1,3})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4].padEnd(3, '0'));
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
};

export const averageFaceLandmarks = (frames: VideoFrameResult[]) => {
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

export const mergeUniqueDetections = (frames: VideoFrameResult[]) => {
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
      (value): value is number[] => Array.isArray(value) && value.every((item) => typeof item === 'number')
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

export const aggregateMetrics = (frames: VideoFrameResult[]) => {
  const metricsList = frames
    .map((frame) => frame.metrics)
    .filter((value): value is Record<string, unknown> => isPlainObject(value));
  if (!metricsList.length) return null;
  return aggregateMetricsObject(metricsList);
};

export const pickThumbnail = (frames: VideoFrameResult[]) =>
  frames.find((frame) => frame.thumbnail_base64)?.thumbnail_base64 ?? null;
