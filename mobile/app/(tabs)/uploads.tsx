import { View , ActivityIndicator, Alert, ScrollView} from 'react-native';

import { useMemo, useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { useSettings } from '@/hooks/useSettings';

type SelectedVideo = {
  uri: string;
  name: string;
  sizeBytes: number;
  durationMs?: number;
  mimeType: string;
};

type VideoProcessingResponse = {
  video_metadata: {
    duration_sec: number;
    total_frames_processed: number;
    fps: number;
    resolution: { width: number; height: number };
  };
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
};

const formatDuration = (durationMs?: number) => {
  if (!durationMs) return 'Unknown';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function UploadsScreen() {
  const { settings } = useSettings();
  const apiBaseUrl = useMemo(
    () => settings.apiBaseUrl.trim().replace(/\/$/, ''),
    [settings.apiBaseUrl]
  );

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
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (selection.canceled || !selection.assets?.length) {
      return;
    }

    const asset = selection.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'upload.mp4';
    const info = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes = asset.fileSize ?? (info.exists ? info.size ?? 0 : 0);
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
    formData.append(
      'video',
      {
        uri: selectedVideo.uri,
        name: selectedVideo.name,
        type: selectedVideo.mimeType,
      } as unknown as Blob
    );

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseUrl}/driver-monitoring/process-video`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(progress);
      if (progress >= 100) {
        setIsProcessing(true);
      }
    };

    xhr.upload.onload = () => {
      setIsProcessing(true);
    };

    xhr.onload = () => {
      setIsUploading(false);
      setIsProcessing(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as VideoProcessingResponse;
          setResult(parsed);
        } catch {
          setError('Upload succeeded but response could not be parsed.');
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText) as { detail?: string };
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

  return (
    <ScrollView className="flex-1 px-4 py-6">
    <Text variant="h3" className="mb-2">
      Uploads
    </Text>
    <Text className="text-sm text-muted-foreground">
      Upload a recorded drive to run the same monitoring metrics as a live session.
    </Text>

    <View className="mt-6 gap-3">
      <Button onPress={handleSelectVideo} variant="secondary">
        <Text>Select Video</Text>
      </Button>

      {selectedVideo ? (
        <View className="rounded-md border border-border bg-muted/40 p-4">
          <Text className="font-semibold">{selectedVideo.name}</Text>
          <Text className="text-sm text-muted-foreground">
            Duration: {formatDuration(selectedVideo.durationMs)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            Size: {formatBytes(selectedVideo.sizeBytes)}
          </Text>
          {selectedVideo.sizeBytes > 50 * 1024 * 1024 ? (
            <Text className="mt-1 text-sm text-amber-500">
              Large file detected. Consider compressing for faster uploads.
            </Text>
          ) : null}
        </View>
      ) : (
        <Text className="text-sm text-muted-foreground">
          No video selected yet. Choose one to preview details before uploading.
        </Text>
      )}

      <Button onPress={handleUpload} disabled={!selectedVideo || isUploading}>
        <Text>{isUploading ? 'Uploading...' : 'Upload & Analyze'}</Text>
      </Button>

      {isUploading ? (
        <Text className="text-sm text-muted-foreground">Upload progress: {uploadProgress}%</Text>
      ) : null}

      {isProcessing ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator />
          <Text className="text-sm text-muted-foreground">
            Upload complete. Processing video frames...
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text className="text-sm text-destructive">Error: {error}</Text>
      ) : null}

      {result ? (
        <View className="rounded-md border border-border bg-background p-4">
          <Text className="font-semibold">Processing Summary</Text>
          <Text className="text-sm text-muted-foreground">
            Duration: {result.video_metadata.duration_sec.toFixed(1)}s
          </Text>
          <Text className="text-sm text-muted-foreground">
            Frames processed: {result.video_metadata.total_frames_processed}
          </Text>
          <Text className="text-sm text-muted-foreground">
            FPS: {result.video_metadata.fps}
          </Text>
          <Text className="text-sm text-muted-foreground">
            Resolution: {result.video_metadata.resolution.width} x{' '}
            {result.video_metadata.resolution.height}
          </Text>
        </View>
      ) : null}
    </View>
  </ScrollView>
);
}
