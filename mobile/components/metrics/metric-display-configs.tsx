import { MetricId } from '@/types/metrics';
import { ReactNode } from 'react';
import { Fontisto, MaterialCommunityIcons } from '@expo/vector-icons';

export interface MetricConfig {
  icon: (props: { size: number; color: string }) => ReactNode;
  label: string;
  getWarningState: (data: any) => boolean;
  getFillRatio?: (data: any) => number | undefined;
}

/** Display configuration for each metric */
export const METRIC_DISPLAY_CONFIGS: Record<MetricId, MetricConfig> = {
  eye_closure: {
    icon: ({ size, color }) => <MaterialCommunityIcons name="eye" size={size} color={color} />,
    label: 'Eyes',
    getWarningState: (data) => data?.ear_alert === true,
    getFillRatio: (data) =>
      data?.perclos != null ? Math.max(0, Math.min(1, data.perclos)) : undefined,
  },
  yawn: {
    icon: ({ size, color }) => <Fontisto name="open-mouth" size={size} color={color} />,
    label: 'Yawn',
    getWarningState: (data) => data?.yawning === true,
    getFillRatio: (data) =>
      data?.yawn_rate != null ? Math.max(0, Math.min(1, data.yawn_rate)) : undefined,
  },
  head_pose: {
    icon: ({ size, color }) => <MaterialCommunityIcons name="head" size={size} color={color} />,
    label: 'Head',
    getWarningState: (data) => Boolean(data?.yaw_alert || data?.pitch_alert || data?.roll_alert),
    getFillRatio: (data) => {
      if (!data) return undefined;
      return Math.max(data.yaw_sustained, data.pitch_sustained, data.roll_sustained);
    },
  },
  gaze: {
    icon: ({ size, color }) => <MaterialCommunityIcons name="bullseye" size={size} color={color} />,
    label: 'Gaze',
    getWarningState: (data) => data?.gaze_on_road === false,
  },
  phone_usage: {
    icon: ({ size, color }) => (
      <MaterialCommunityIcons name="cellphone" size={size} color={color} />
    ),
    label: 'Phone',
    getWarningState: (data) => Boolean(data?.phone_usage && data.phone_usage > 0),
    getFillRatio: (data) =>
      data?.phone_detected_frames != null
        ? Math.max(0, Math.min(1, data.phone_detected_frames / 50))
        : undefined,
  },
} as const;
