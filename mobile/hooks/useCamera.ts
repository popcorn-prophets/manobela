import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { mediaDevices, MediaStream } from 'react-native-webrtc';
import { Constraints } from 'react-native-webrtc/lib/typescript/getUserMedia';

interface UseCameraReturn {
  localStream: MediaStream | null;
}

/**
 * Initializes the front-facing camera and exposes a MediaStream.
 */
export function useCamera(): UseCameraReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const isInitializingRef = useRef(false);

  const hasLiveVideoTrack = useCallback((stream: MediaStream | null) => {
    if (!stream) return false;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return false;
    return tracks.every((track) => track.readyState === 'live');
  }, []);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const initCamera = useCallback(async () => {
    if (isInitializingRef.current) return;
    if (hasLiveVideoTrack(streamRef.current)) return;
    isInitializingRef.current = true;

    try {
      // Constraints for camera
      const constraints: Constraints = {
        audio: false, // no audio
        video: {
          facingMode: 'user', // front camera
          width: { ideal: 480, max: 640 },
          height: { ideal: 320, max: 480 },
          frameRate: { ideal: 15, max: 24 },
        },
      };

      stopStream(streamRef.current);
      streamRef.current = null;
      if (isMountedRef.current) {
        setLocalStream(null);
      }

      const stream = await mediaDevices.getUserMedia(constraints);

      if (!isMountedRef.current) {
        stopStream(stream);
        return;
      }

      streamRef.current = stream;
      setLocalStream(stream);
    } catch (err) {
      console.error('Failed to get camera', err);
    } finally {
      isInitializingRef.current = false;
    }
  }, [hasLiveVideoTrack, stopStream]);

  useEffect(() => {
    isMountedRef.current = true;
    void initCamera();
    // Stop all tracks when the component unmounts
    return () => {
      isMountedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [initCamera, stopStream]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void initCamera();
      }
    });

    return () => subscription.remove();
  }, [initCamera]);

  return { localStream };
}
