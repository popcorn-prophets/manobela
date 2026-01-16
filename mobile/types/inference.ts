/**
 * Inference data.
 */
export interface InferenceData {
  /** ISO 8601 timestamp when frame was processed */
  timestamp: string;

  /** Resolution of the processed video frame */
  resolution: {
    width: number;
    height: number;
  };

  /**
   * Flat array of facial landmarks [x1, y1, x2, y2, ...] or null if no face detected.
   * Coordinates are normalized (0-1 range)
   */
  face_landmarks: number[] | null;

  /**
   * Object detections with normalized bounding boxes
   */
  object_detections: ObjectDetection[] | null;

  /**
   * Metrics calculated for this frame
   */
  metrics: Record<string, any> | null;
}

/**
 * Object detection result for a single detected object.
 */
export interface ObjectDetection {
  /** Bounding box in normalized coordinates [x1, y1, x2, y2] (0-1 range) */
  bbox: [number, number, number, number];

  /** Confidence score (0-1 range) */
  conf: number;

  /** COCO dataset class ID */
  class_id: number;
}
