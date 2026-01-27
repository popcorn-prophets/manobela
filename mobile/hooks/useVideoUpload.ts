import { Alert } from 'react-native';

import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import type { SelectedVideo, VideoProcessingResponse } from '@/types/video';
import { sessionLogger } from '@/services/logging/session-logger';

type UseVideoUploadResult = {
  selectedVideo: SelectedVideo | null;
  uploadProgress: number;
  isUploading: boolean;
  isProcessing: boolean;
  error: string | null;
  result: VideoProcessingResponse | null;
  handleSelectVideo: () => Promise<void>;
  handleUpload: () => void;
};

export const useVideoUpload = (apiBaseUrl: string): UseVideoUploadResult => {
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoProcessingResponse | null>(null);

  const handleSelectVideo = async () => {
    setError(null);
    setResult(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library.');
      return;
    }

    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (selection.canceled || !selection.assets?.length) {
      return;
    }

    const asset = selection.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload.mp4';
    const info = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes = asset.fileSize ?? (info.exists ? (info.size ?? 0) : 0);
    const durationMs = asset.duration ?? undefined;
    const mimeType = asset.mimeType ?? 'video/mp4';

    setSelectedVideo({
      uri: asset.uri,
      name,
      sizeBytes,
      durationMs,
      mimeType,
    });
  };

  const handleUpload = () => {
    if (!selectedVideo) return;
    if (!apiBaseUrl) {
      Alert.alert('Missing API URL', 'Configure your API base URL in Settings.');
      return;
    }

    setIsUploading(true);
    setIsProcessing(false);
    setUploadProgress(0);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('video', {
      uri: selectedVideo.uri,
      name: selectedVideo.name,
      type: selectedVideo.mimeType,
    } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    const uploadUrl =
      `${apiBaseUrl}/driver-monitoring/process-video` +
      `?group_interval_sec=5&include_frames=true&target_fps=10`;
    xhr.open('POST', uploadUrl);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      const clampedProgress = Math.min(100, Math.max(0, progress));
      setUploadProgress(clampedProgress);
      if (clampedProgress >= 100) {
        setIsProcessing(true);
      }
    };

    xhr.upload.onload = () => {
      setIsProcessing(true);
    };

    xhr.onload = () => {
      setIsUploading(false);
      setIsProcessing(false);

      const responseBody = xhr.response ?? xhr.responseText;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed =
            typeof responseBody === 'string'
              ? (JSON.parse(responseBody) as VideoProcessingResponse)
              : (responseBody as VideoProcessingResponse);
          const trimmedFrames = parsed.frames?.map((frame) => ({
            timestamp: frame.timestamp,
            frame_number: frame.frame_number,
            resolution: frame.resolution,
            face_landmarks: frame.face_landmarks,
            object_detections: frame.object_detections,
            metrics: null,
            thumbnail_base64: null,
          }));
          setResult({ ...parsed, frames: trimmedFrames });

          // Log the uploaded video to the database for insights
          if (selectedVideo) {
            sessionLogger
              .logUploadedVideo(parsed, selectedVideo.name)
              .then(() => {
                console.log('Successfully logged uploaded video to insights');
              })
              .catch((err) => {
                console.error('Failed to log uploaded video session:', err);
                Alert.alert(
                  'Warning',
                  'Video processed successfully but could not be saved to insights. You can still view the results above.'
                );
              });
          }
        } catch {
          setError('Upload succeeded but response could not be parsed.');
        }
      } else {
        try {
          const parsed =
            typeof responseBody === 'string'
              ? (JSON.parse(responseBody) as { detail?: string })
              : (responseBody as { detail?: string });
          setError(parsed.detail ?? 'Upload failed. Please try again.');
        } catch {
          setError('Upload failed. Please try again.');
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setIsProcessing(false);
      setError('Upload failed. Please check your connection.');
    };

    xhr.send(formData);
  };

  return {
    selectedVideo,
    uploadProgress,
    isUploading,
    isProcessing,
    error,
    result,
    handleSelectVideo,
    handleUpload,
  };
};
