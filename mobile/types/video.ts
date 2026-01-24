import type { ObjectDetection } from './inference';

export type SelectedVideo = {
  uri: string;
  name: string;
  sizeBytes: number;
  durationMs?: number;
  mimeType: string;
};

export type VideoProcessingResponse = {
  video_metadata: {
    duration_sec: number;
    total_frames_processed: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  frames: VideoFrameResult[];
};

export type VideoFrameResult = {
  timestamp: string;
  frame_number: number;
  resolution: { width: number; height: number };
  face_landmarks: number[] | null;
  object_detections: ObjectDetection[] | null;
  metrics: Record<string, unknown> | null;
  thumbnail_base64: string | null;
};
