import React, { useMemo, useState, useEffect } from 'react';
import { View } from 'react-native';
import { GridConfig, PolygonConfig, RadarChart } from 'react-native-gifted-charts';
import { useTheme, useIsFocused } from '@react-navigation/native';

export type KpiRadarProps = {
  eyeClosedPercent: number; // 0–1
  yawnAlertPercent: number; // 0–1
  phoneUsagePercent: number; // 0–1
  gazeAlertPercent: number; // 0–1
  headPoseAlertPercent: number; // 0–1
  faceMissingPercent: number; // 0–1
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Shows a radar chart of KPI values.
 */
export const KpiRadar = ({
  eyeClosedPercent,
  yawnAlertPercent,
  phoneUsagePercent,
  gazeAlertPercent,
  headPoseAlertPercent,
  faceMissingPercent,
}: KpiRadarProps) => {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [chartKey, setChartKey] = useState(0);

  // Force chart remount when screen becomes focused
  useEffect(() => {
    if (isFocused) {
      setChartKey((prev) => prev + 1);
    }
  }, [isFocused]);

  /**
   * Convert 0–1 KPI values into radar chart values (0–100),
   * normalized against the max KPI to preserve relative shape.
   */
  const radarData = useMemo(() => {
    const values = [
      clamp01(eyeClosedPercent),
      clamp01(phoneUsagePercent),
      clamp01(gazeAlertPercent),
      clamp01(headPoseAlertPercent),
      clamp01(faceMissingPercent),
      clamp01(yawnAlertPercent),
    ];

    const maxValue = Math.max(...values, 0.0001); // avoid divide-by-zero

    return values.map((v) => (v / maxValue) * 100);
  }, [
    eyeClosedPercent,
    phoneUsagePercent,
    gazeAlertPercent,
    headPoseAlertPercent,
    faceMissingPercent,
    yawnAlertPercent,
  ]);

  const polygonConfig: PolygonConfig = useMemo(
    () => ({
      stroke: colors.destructive,
      strokeWidth: 2,
      fill: colors.destructive,
      gradientColor: colors.destructive,
      showGradient: true,
      opacity: 0.8,
      gradientOpacity: 0.6,
      isAnimated: true,
      animationDuration: 800,
    }),
    [colors]
  );

  const labelConfig = useMemo(
    () => ({
      stroke: colors.text,
      fontSize: 14,
    }),
    [colors]
  );

  const gridConfig: GridConfig = useMemo(
    () => ({
      fill: colors.background,
      gradientColor: colors.border,
    }),
    [colors]
  );

  return (
    <View>
      <RadarChart
        key={chartKey}
        data={radarData}
        maxValue={100}
        labels={['Eye', 'Phone', 'Gaze', 'Head', 'Face', 'Yawn']}
        labelConfig={labelConfig}
        polygonConfig={polygonConfig}
        gridConfig={gridConfig}
      />
    </View>
  );
};
