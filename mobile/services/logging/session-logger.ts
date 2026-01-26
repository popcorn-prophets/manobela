import { db } from '@/db/client';
import { sessions, metrics } from '@/db/schema';
import uuid from 'react-native-uuid';
import { InferenceData } from '@/types/inference';
import { VideoProcessingResponse } from '@/types/video';
import { eq } from 'drizzle-orm';

type NewMetric = typeof metrics.$inferInsert;
type NewSession = typeof sessions.$inferInsert;

/**
 * Read-only flag
 */
let readOnly = false;

/**
 * In-memory buffer
 */
const metricBuffer: NewMetric[] = [];

/**
 * Flush timer handle
 */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Session state
 */
let currentSessionId: string | null = null;
let lastLoggedAt = 0;

/**
 * Controls
 */
const LOG_INTERVAL_MS = 3_000; // throttle logging for n seconds
const FLUSH_INTERVAL_MS = 6_000; // flush every n seconds
const MAX_BUFFER_SIZE = 20; // flush when buffer is full

/**
 * Flush buffer to database in a transaction
 */
const flushBuffer = async () => {
  if (readOnly) return; // <-- BLOCK WRITES
  if (metricBuffer.length === 0) return;

  const batch = metricBuffer.splice(0, metricBuffer.length);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(metrics).values(batch);
    });
  } catch (error) {
    console.error('Failed to flush metrics buffer:', error);
  } finally {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
};

export const sessionLogger = {
  /** Enable/disable read-only mode */
  setReadOnly: (value: boolean) => {
    readOnly = value;
  },

  /**
   * Log metrics for the current session
   */
  logMetrics: (data: InferenceData | null) => {
    if (readOnly) return; // blocks writes
    if (!currentSessionId || !data?.metrics) return;

    const now = Date.now();
    if (now - lastLoggedAt < LOG_INTERVAL_MS) return;
    lastLoggedAt = now;

    const m = data.metrics;
    const id = uuid.v4();

    metricBuffer.push({
      id,
      sessionId: currentSessionId,
      timestamp: now,

      faceMissing: m.face_missing,

      ear: m.eye_closure.ear,
      eyeClosed: m.eye_closure.eye_closed,
      eyeClosedSustained: m.eye_closure.eye_closed_sustained,
      perclos: m.eye_closure.perclos,
      perclosAlert: m.eye_closure.perclos_alert,

      mar: m.yawn.mar,
      yawning: m.yawn.yawning,
      yawnSustained: m.yawn.yawn_sustained,
      yawnCount: m.yawn.yawn_count,

      yaw: m.head_pose.yaw,
      pitch: m.head_pose.pitch,
      roll: m.head_pose.roll,
      yawAlert: m.head_pose.yaw_alert,
      pitchAlert: m.head_pose.pitch_alert,
      rollAlert: m.head_pose.roll_alert,
      headPoseSustained: m.head_pose.head_pose_sustained,

      gazeAlert: m.gaze.gaze_alert,
      gazeSustained: m.gaze.gaze_sustained,

      phoneUsage: m.phone_usage.phone_usage,
      phoneUsageSustained: m.phone_usage.phone_usage_sustained,
    } as NewMetric);

    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flushBuffer();
      }, FLUSH_INTERVAL_MS);
    }

    if (metricBuffer.length >= MAX_BUFFER_SIZE) {
      void flushBuffer();
    }
  },

  /**
   * Process and log an uploaded video as a session
   */
  logUploadedVideo: async (videoResult: VideoProcessingResponse, videoName: string) => {
    if (readOnly) return null; // blocks writes

    const sessionId = uuid.v4();
    const startedAt = Date.now();
    const durationMs = Math.round(videoResult.video_metadata.duration_sec * 1000);
    const endedAt = startedAt + durationMs;

    try {
      await db.transaction(async (tx) => {
        // Create the upload session
        await tx.insert(sessions).values({
          id: sessionId,
          clientId: videoName,
          startedAt,
          endedAt,
          durationMs,
          sessionType: 'upload',
        } as NewSession);

        // Process groups and create metrics from aggregated data
        const metricsToInsert: NewMetric[] = [];

        for (const group of videoResult.groups) {
          if (!group.aggregate.metrics) continue;

          const m = group.aggregate.metrics as any;
          // Use the middle timestamp of the group interval
          const groupMidpointSec = (group.start_sec + group.end_sec) / 2;
          const timestamp = startedAt + groupMidpointSec * 1000;

          metricsToInsert.push({
            id: uuid.v4(),
            sessionId,
            timestamp: Math.round(timestamp),

            faceMissing: m.face_missing ?? false,

            ear: m.eye_closure?.ear ?? null,
            eyeClosed: m.eye_closure?.eye_closed ?? false,
            eyeClosedSustained: m.eye_closure?.eye_closed_sustained ?? 0,
            perclos: m.eye_closure?.perclos ?? null,
            perclosAlert: m.eye_closure?.perclos_alert ?? false,

            mar: m.yawn?.mar ?? null,
            yawning: m.yawn?.yawning ?? false,
            yawnSustained: m.yawn?.yawn_sustained ?? 0,
            yawnCount: m.yawn?.yawn_count ?? 0,

            yaw: m.head_pose?.yaw ?? null,
            pitch: m.head_pose?.pitch ?? null,
            roll: m.head_pose?.roll ?? null,
            yawAlert: m.head_pose?.yaw_alert ?? false,
            pitchAlert: m.head_pose?.pitch_alert ?? false,
            rollAlert: m.head_pose?.roll_alert ?? false,
            headPoseSustained: m.head_pose?.head_pose_sustained ?? 0,

            gazeAlert: m.gaze?.gaze_alert ?? false,
            gazeSustained: m.gaze?.gaze_sustained ?? 0,

            phoneUsage: m.phone_usage?.phone_usage ?? false,
            phoneUsageSustained: m.phone_usage?.phone_usage_sustained ?? 0,
          } as NewMetric);
        }

        // Insert all metrics in batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < metricsToInsert.length; i += BATCH_SIZE) {
          const batch = metricsToInsert.slice(i, i + BATCH_SIZE);
          await tx.insert(metrics).values(batch);
        }
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to log uploaded video session:', error);
      throw error; // Re-throw to allow caller to handle
    }
  },

  /**
   * Start a new session
   */
  startSession: async (clientId: string | null, sessionType: 'live' | 'upload' = 'live') => {
    if (readOnly) return null; // blocks writes

    const id = uuid.v4();

    await db.insert(sessions).values({
      id,
      clientId: clientId ?? 'unknown',
      startedAt: Date.now(),
      sessionType,
    } as NewSession);

    currentSessionId = id;
    lastLoggedAt = 0;

    return id;
  },

  /**
   * End the current session
   */
  endSession: async () => {
    if (readOnly) return; // block writes

    if (!currentSessionId) return;

    await flushBuffer();

    const endedAt = Date.now();

    const sessionRows = await db
      .select({ startedAt: sessions.startedAt })
      .from(sessions)
      .where(eq(sessions.id, currentSessionId));

    if (sessionRows.length === 0) {
      console.error('Session not found for ID:', currentSessionId);
      currentSessionId = null;
      return;
    }

    const startedAt = sessionRows[0]?.startedAt ?? endedAt;
    const durationMs = endedAt - startedAt;

    await db
      .update(sessions)
      .set({
        endedAt,
        durationMs,
      })
      .where(eq(sessions.id, currentSessionId));

    currentSessionId = null;
  },

  /**
   * Hard reset logger state (used before destructive DB ops)
   */
  reset: async () => {
    currentSessionId = null;
    lastLoggedAt = 0;
    metricBuffer.length = 0;

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  },

  /** Get the current session ID */
  getCurrentSessionId: () => currentSessionId,
};
