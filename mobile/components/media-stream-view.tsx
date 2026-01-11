import { MediaStream, RTCView } from 'react-native-webrtc';
import React from 'react';

type MediaStreamViewProps = {
  stream: MediaStream | null;
  style?: object;
  mirror?: boolean;
};

export const MediaStreamView = ({ stream, style, mirror = true }: MediaStreamViewProps) => {
  if (!stream) return null;

  return (
    <RTCView
      streamURL={stream.toURL()}
      objectFit="contain"
      style={[{ width: '100%', height: '100%' }, style]}
      mirror={mirror}
    />
  );
};
