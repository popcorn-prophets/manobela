import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { VideoPlayer } from 'expo-video';
import type { ObjectDetection } from '@/types/inference';
import type { VideoFrameResult, VideoProcessingResponse } from '@/types/video';
import { parseTimestampSeconds } from '@/utils/videoFormatter';
import { findNearestFrameIndex } from '@/utils/uploadPlayback';

type FrameWithTimestamp = VideoFrameResult & { timestampSec: number };
type OverlaySnapshot = {
  landmarks: number[] | null;
  detections: ObjectDetection[] | null;
  atMs: number;
};

type UseUploadPlaybackArgs = {
  result: VideoProcessingResponse | null;
  selectedVideoUri?: string | null;
  showOverlays: boolean;
  holdMs?: number;
  player?: VideoPlayer | null;
};

type UseUploadPlaybackResult = {
  activeFrame: FrameWithTimestamp | null;
  playbackAspectRatio: number;
  playbackPositionMs: number;
  totalDurationMs: number | null;
  playbackView: { width: number; height: number };
  handlePlaybackLayout: (event: LayoutChangeEvent) => void;
  overlayLandmarks: number[] | null;
  overlayDetections: ObjectDetection[] | null;
  canRenderOverlay: boolean;
  hasOverlayData: boolean;
  videoWidth: number;
  videoHeight: number;
};

const DEFAULT_HOLD_MS = 450;

export const useUploadPlayback = ({
  result,
  selectedVideoUri,
  showOverlays,
  holdMs = DEFAULT_HOLD_MS,
  player,
}: UseUploadPlaybackArgs): UseUploadPlaybackResult => {
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [playbackDurationMs, setPlaybackDurationMs] = useState<number | null>(null);
  const [playbackView, setPlaybackView] = useState({ width: 0, height: 0 });
  const [overlaySnapshot, setOverlaySnapshot] = useState<OverlaySnapshot | null>(null);

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
  }, [selectedVideoUri]);

  // Single effect that sets up listeners and handles position updates
  useEffect(() => {
    if (!player) return;

    let mounted = true;

    // Initial position and duration
    if (Number.isFinite(player.currentTime)) {
      setPlaybackPositionMs(Math.max(0, Math.round(player.currentTime * 1000)));
    }
    if (Number.isFinite(player.duration) && player.duration > 0) {
      setPlaybackDurationMs(Math.round(player.duration * 1000));
    }

    // Debounce timer for position updates
    let updateTimer: ReturnType<typeof setTimeout>;

    const timeSub = player.addListener('timeUpdate', (payload) => {
      if (!mounted) return;

      // Clear existing timer
      if (updateTimer) clearTimeout(updateTimer);

      // Debounce the update to avoid excessive state changes
      updateTimer = setTimeout(() => {
        if (mounted) {
          setPlaybackPositionMs(Math.max(0, Math.round(payload.currentTime * 1000)));
        }
      }, 16);
    });

    const sourceSub = player.addListener('sourceLoad', (payload) => {
      if (!mounted) return;
      if (Number.isFinite(payload.duration) && payload.duration > 0) {
        setPlaybackDurationMs(Math.round(payload.duration * 1000));
      }
    });

    return () => {
      mounted = false;
      if (updateTimer) clearTimeout(updateTimer);
      timeSub.remove();
      sourceSub.remove();
    };
  }, [player]);

  const handlePlaybackLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPlaybackView({ width, height });
  }, []);

  const playbackAspectRatio = useMemo(() => {
    const width = result?.video_metadata?.resolution?.width ?? 16;
    const height = result?.video_metadata?.resolution?.height ?? 9;
    if (height <= 0) return 16 / 9;
    return width / height;
  }, [result?.video_metadata?.resolution?.width, result?.video_metadata?.resolution?.height]);

  const activeFrame = useMemo<FrameWithTimestamp | null>(() => {
    if (framesWithTime.length === 0) return null;
    const playbackSeconds = playbackPositionMs / 1000;
    const index = findNearestFrameIndex(framesWithTime, playbackSeconds);
    return index === null ? null : framesWithTime[index];
  }, [framesWithTime, playbackPositionMs]);

  useEffect(() => {
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
        atMs: playbackPositionMs,
      });
      return;
    }

    setOverlaySnapshot((prev) => {
      if (!prev) return null;
      const delta = playbackPositionMs - prev.atMs;
      if (delta < 0) return null;
      if (delta <= holdMs) return prev;
      return null;
    });
  }, [activeFrame, playbackPositionMs, showOverlays, holdMs]);

  const overlayLandmarks = showOverlays ? (overlaySnapshot?.landmarks ?? null) : null;
  const overlayDetections = showOverlays ? (overlaySnapshot?.detections ?? null) : null;
  const canRenderOverlay = playbackView.width > 0 && playbackView.height > 0;
  const hasOverlayData = Boolean(overlayLandmarks?.length) || Boolean(overlayDetections?.length);

  const totalDurationMs =
    playbackDurationMs ??
    (result?.video_metadata?.duration_sec
      ? Math.round(result.video_metadata.duration_sec * 1000)
      : null);

  const videoWidth = result?.video_metadata?.resolution?.width ?? 1;
  const videoHeight = result?.video_metadata?.resolution?.height ?? 1;

  return {
    activeFrame,
    playbackAspectRatio,
    playbackPositionMs,
    totalDurationMs,
    playbackView,
    handlePlaybackLayout,
    overlayLandmarks,
    overlayDetections,
    canRenderOverlay,
    hasOverlayData,
    videoWidth,
    videoHeight,
  };
};
