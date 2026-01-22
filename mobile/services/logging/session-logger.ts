import { db } from '@/db/client';
import { sessions, metrics } from '@/db/schema';
import uuid from 'react-native-uuid';
import { InferenceData } from '@/types/inference';
import { eq } from 'drizzle-orm';

type NewMetric = typeof metrics.$inferInsert;
type NewSession = typeof sessions.$inferInsert;

let currentSessionId: string | null = null;
let lastLoggedAt = 0;
const LOG_INTERVAL_MS = 3_000; // throttle to per n seconds

export const sessionLogger = {
  /**
   * Start a new session
   */
  startSession: async (clientId: string | null) => {
    const id = uuid.v4();
    currentSessionId = id;

    console.log(`Start session of client ${clientId}`);

    await db.insert(sessions).values({
      id,
      clientId: clientId ?? 'unknown',
      startedAt: Date.now(),
    } as NewSession);

    lastLoggedAt = 0;
    return id;
  },

  /**
   * Log metrics for the current session
   */
  logMetrics: async (data: InferenceData | null) => {
    if (!currentSessionId || !data || !data.metrics) return;

    const now = Date.now();
    if (now - lastLoggedAt < LOG_INTERVAL_MS) return;
    lastLoggedAt = now;

    const m = data.metrics;
    const id = uuid.v4();

    console.log(`Log metrics for session ${currentSessionId}`);

    await db.insert(metrics).values({
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

      yawAlert: m.head_pose.yaw_alert,
      pitchAlert: m.head_pose.pitch_alert,
      rollAlert: m.head_pose.roll_alert,
      yaw: m.head_pose.yaw,
      pitch: m.head_pose.pitch,
      roll: m.head_pose.roll,
      headPoseSustained: m.head_pose.head_pose_sustained,

      gazeAlert: m.gaze.gaze_alert,
      gazeSustained: m.gaze.gaze_sustained,

      phoneUsage: m.phone_usage.phone_usage,
      phoneUsageSustained: m.phone_usage.phone_usage_sustained,
    } as NewMetric);
  },

  /**
   * End the current session
   */
  endSession: async () => {
    if (!currentSessionId) return;

    const endedAt = Date.now();

    const sessionRows = await db
      .select({ startedAt: sessions.startedAt })
      .from(sessions)
      .where(eq(sessions.id, currentSessionId));

    const startedAt = sessionRows[0]?.startedAt ?? endedAt;
    const durationMs = endedAt - startedAt;

    console.log(`End session of session ${currentSessionId}`);

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
  },

  /** Get the current session ID */
  getCurrentSessionId: () => currentSessionId,
};
