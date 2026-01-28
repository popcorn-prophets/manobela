import { useMemo, useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useDatabase } from '@/components/database-provider';
import { useInsightRefresh } from '@/hooks/useInsightsRefresh';
import { sessions, metrics } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { SessionsList } from '@/components/insights/sessions-list';
import { KpiRadar } from '@/components/charts/kpi-radar';
import { KpiCard } from '@/components/insights/kpi-card';
import { useSessionStore } from '@/stores/sessionStore';

export default function InsightsScreen() {
  const { db } = useDatabase();
  const router = useRouter();
  const pathname = usePathname();
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const { tick } = useInsightRefresh();

  const { data: sessionList = [] } = useLiveQuery(
    db.select().from(sessions).orderBy(desc(sessions.startedAt)),
    [tick]
  );

  const { data: allMetrics = [] } = useLiveQuery(db.select().from(metrics), [tick]);

  // Only redirect if:
  // (1) a session is active, and
  // (2) current path starts with /insights (i.e., Insights tab is visible)
  useEffect(() => {
    if (!activeSessionId) return;
    if (!pathname.startsWith('/insights')) return;

    router.replace(`/insights/session/${activeSessionId}`);
  }, [activeSessionId, pathname, router]);

  const {
    eyeClosedPercent,
    totalYawns,
    yawnAlertPercent,
    phoneUsagePercent,
    gazeAlertPercent,
    headPoseAlertPercent,
    faceMissingPercent,
  } = useMemo(() => {
    const total = allMetrics.length;

    if (!total) {
      return {
        eyeClosedPercent: 0,
        totalYawns: 0,
        yawnAlertPercent: 0,
        phoneUsagePercent: 0,
        gazeAlertPercent: 0,
        headPoseAlertPercent: 0,
        faceMissingPercent: 0,
      };
    }

    let eyeClosed = 0;
    let phoneUsage = 0;
    let gazeAlerts = 0;
    let headPoseAlerts = 0;
    let faceMissing = 0;
    let yawnAlerts = 0;

    for (let i = 0; i < total; i++) {
      const m = allMetrics[i];

      if (m.eyeClosed) eyeClosed++;
      if (m.phoneUsage) phoneUsage++;
      if (m.gazeAlert) gazeAlerts++;
      if (m.faceMissing) faceMissing++;
      if (m.yawning) yawnAlerts++;
      if (m.yawAlert || m.pitchAlert || m.rollAlert) headPoseAlerts++;
    }

    return {
      eyeClosedPercent: eyeClosed / total,
      phoneUsagePercent: phoneUsage / total,
      gazeAlertPercent: gazeAlerts / total,
      headPoseAlertPercent: headPoseAlerts / total,
      faceMissingPercent: faceMissing / total,
      yawnAlertPercent: yawnAlerts / total,
      totalYawns: allMetrics[total - 1]?.yawnCount ?? 0,
    };
  }, [allMetrics]);

  return (
    <View className="flex-1 px-4 py-4">
      <KpiCard
        eyeClosedPercent={eyeClosedPercent}
        totalYawnCount={totalYawns}
        phoneUsagePercent={phoneUsagePercent}
        gazeAlertPercent={gazeAlertPercent}
        headPoseAlertPercent={headPoseAlertPercent}
        faceMissingPercent={faceMissingPercent}
      />

      <KpiRadar
        eyeClosedPercent={eyeClosedPercent}
        yawnAlertPercent={yawnAlertPercent}
        phoneUsagePercent={phoneUsagePercent}
        gazeAlertPercent={gazeAlertPercent}
        headPoseAlertPercent={headPoseAlertPercent}
        faceMissingPercent={faceMissingPercent}
      />

      <SessionsList
        sessions={sessionList}
        onPressSession={(id) => router.push(`/insights/session/${id}`)}
      />
    </View>
  );
}
