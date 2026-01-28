import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  resolution: { width: number; height: number } | null;
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
  groups: VideoProcessingResponse['groups'];
  activeGroup: VideoProcessingResponse['groups'][number] | null;
  playbackAspectRatio: number;
  playbackPositionMs: number;
  totalDurationMs: number | null;
  playbackView: { width: number; height: number };
  handlePlaybackLayout: (event: LayoutChangeEvent) => void;
  overlayLandmarks: number[] | null;
  overlayDetections: ObjectDetection[] | null;
  overlayResolution: { width: number; height: number } | null;
  canRenderOverlay: boolean;
  hasOverlayData: boolean;
  groupIntervalSec: number;
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
  const lastPositionRef = useRef<number | null>(null);
  const lastDurationRef = useRef<number | null>(null);

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
    lastPositionRef.current = null;
    lastDurationRef.current = null;
  }, [selectedVideoUri]);

  useEffect(() => {
    if (!player) return;

    let mounted = true;

    const updatePosition = (ms: number) => {
      if (!mounted) return;
      if (lastPositionRef.current === ms) return;
      lastPositionRef.current = ms;
      setPlaybackPositionMs(ms);
    };

    const updateDuration = (ms: number) => {
      if (!mounted) return;
      if (lastDurationRef.current === ms) return;
      lastDurationRef.current = ms;
      setPlaybackDurationMs(ms);
    };

    if (Number.isFinite(player.currentTime)) {
      updatePosition(Math.max(0, Math.round(player.currentTime * 1000)));
    }
    if (Number.isFinite(player.duration) && player.duration > 0) {
      updateDuration(Math.round(player.duration * 1000));
    }

    const timeSub = player.addListener('timeUpdate', (payload) => {
      if (!Number.isFinite(payload.currentTime)) return;
      updatePosition(Math.max(0, Math.round(payload.currentTime * 1000)));
    });

    const sourceSub = player.addListener('sourceLoad', (payload) => {
      if (Number.isFinite(payload.duration) && payload.duration > 0) {
        updateDuration(Math.round(payload.duration * 1000));
      }
    });

    return () => {
      mounted = false;
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
    const index = findNearestFrameIndex(framesWithTime, playbackSeconds);
    return index === null ? null : framesWithTime[index];
  }, [framesWithTime, playbackSeconds]);

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
        resolution: activeFrame.resolution ?? null,
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

  const fallbackLandmarks = activeGroup?.aggregate.face_landmarks ?? null;
  const fallbackDetections = activeGroup?.aggregate.object_detections ?? null;

  const overlayResolution =
    overlaySnapshot?.resolution ??
    activeFrame?.resolution ??
    activeGroup?.aggregate.resolution ??
    result?.video_metadata?.resolution ??
    null;
  const overlayLandmarks = showOverlays
    ? overlaySnapshot
      ? overlaySnapshot.landmarks
      : fallbackLandmarks
    : null;
  const overlayDetections = showOverlays
    ? overlaySnapshot
      ? overlaySnapshot.detections
      : fallbackDetections
    : null;
  const canRenderOverlay =
    Boolean(overlayResolution) && playbackView.width > 0 && playbackView.height > 0;
  const hasOverlayData = Boolean(overlayLandmarks?.length) || Boolean(overlayDetections?.length);

  const totalDurationMs =
    playbackDurationMs ??
    (result?.video_metadata?.duration_sec
      ? Math.round(result.video_metadata.duration_sec * 1000)
      : null);
  const groupIntervalSec =
    sortedGroups.length > 0 ? Math.round(sortedGroups[0].end_sec - sortedGroups[0].start_sec) : 0;

  return {
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
  };
};
