import { useEffect, useState } from 'react';
import { mediaDevices, MediaStream } from 'react-native-webrtc';
import { Constraints } from 'react-native-webrtc/lib/typescript/getUserMedia';

interface UseCameraReturn {
  localStream: MediaStream | null;
}

export function useCamera(): UseCameraReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        const constraints: Constraints = {
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, min: 10, max: 30 },
          },
        };
        const stream = await mediaDevices.getUserMedia(constraints);

        if (active) setLocalStream(stream);
      } catch (err) {
        console.error('Failed to get camera', err);
      }
    }

    initCamera();

    return () => {
      active = false;
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { localStream };
}
