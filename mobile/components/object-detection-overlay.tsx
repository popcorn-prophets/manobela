import { ObjectDetection } from '@/types/inference';
import {
  Skia,
  FontStyle,
  Canvas,
  Rect,
  Text as SkiaText,
  Group,
  SkFont,
} from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

// COCO dataset class names (80 classes)
const COCO_CLASSES: { [key: number]: string } = {
  67: 'cell phone',
  // Add more classes as needed
};

const RED = 'rgba(255, 50, 50, 0.8)';
const DEFAULT_COLOR = RED;

// Color palette for different classes
const CLASS_COLORS: { [key: number]: string } = {};

// Font
const FONT_SIZE = 12;
const FONT = Skia.Font(
  Skia.FontMgr.System().matchFamilyStyle('sans-serif', FontStyle.Normal),
  FONT_SIZE
);

const LABEL_PADDING_X = 5; // horizontal padding inside label
const LABEL_PADDING_Y = 2; // vertical padding inside label
const LABEL_HEIGHT = 18; // height of label background
const BOX_STROKE_WIDTH = 2; // bounding box stroke width

interface ObjectDetectionOverlayProps {
  detections: ObjectDetection[] | null;
  videoWidth: number;
  videoHeight: number;
  viewWidth: number;
  viewHeight: number;
  mirror?: boolean;
}

/** Computes the width of a string of text using the system font. */
const getTextWidth = (text: string, font: SkFont) => {
  const glyphs = font.getGlyphIDs(text);
  const widths = font.getGlyphWidths(glyphs);
  return widths.reduce((sum, w) => sum + w, 0);
};

/** Gets the color for a given class ID. */
const getClassColor = (class_id: number) => CLASS_COLORS[class_id] || DEFAULT_COLOR;

/**
 * Renders object detection bounding boxes on top of the video stream.
 */
export const ObjectDetectionOverlay = ({
  detections,
  videoWidth,
  videoHeight,
  viewWidth,
  viewHeight,
  mirror = true,
}: ObjectDetectionOverlayProps) => {
  if (!detections || detections.length === 0) {
    return null;
  }

  // Calculate scaling factors to map from video resolution to view dimensions
  const videoAspect = videoWidth / videoHeight;
  const viewAspect = viewWidth / viewHeight;

  let scaleX: number;
  let scaleY: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > viewAspect) {
    // Video is wider, fit to width
    scaleX = viewWidth;
    scaleY = viewWidth / videoAspect;
    offsetY = (viewHeight - scaleY) / 2;
  } else {
    // Video is taller, fit to height
    scaleY = viewHeight;
    scaleX = viewHeight * videoAspect;
    offsetX = (viewWidth - scaleX) / 2;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group>
        {detections.map((detection, idx) => {
          const [x1, y1, x2, y2] = detection.bbox;
          const { conf, class_id } = detection;

          // Convert normalized coordinates to pixel coordinates
          // Note: Bounding boxes are in normalized coordinates (0-1)
          let pixelX1 = x1 * scaleX + offsetX;
          let pixelY1 = y1 * scaleY + offsetY;
          let pixelX2 = x2 * scaleX + offsetX;
          let pixelY2 = y2 * scaleY + offsetY;

          // Apply mirroring if needed
          if (mirror) {
            const temp = pixelX1;
            pixelX1 = viewWidth - pixelX2;
            pixelX2 = viewWidth - temp;
          }

          // Calculate width and height
          const width = pixelX2 - pixelX1;
          const height = pixelY2 - pixelY1;

          // Get class name
          const className = COCO_CLASSES[class_id] || `Class ${class_id}`;

          // Get color
          const color = getClassColor(class_id);

          // Construct label
          const label = `${className} ${(conf * 100).toFixed(0)}%`;

          const textWidth = getTextWidth(label, FONT);
          const labelY = Math.max(0, pixelY1 - LABEL_HEIGHT - LABEL_PADDING_Y);

          return (
            <Group key={`detection-${idx}`}>
              {/* Bounding box */}
              <Rect
                x={pixelX1}
                y={pixelY1}
                width={width}
                height={height}
                color={color}
                style="stroke"
                strokeWidth={BOX_STROKE_WIDTH}
              />

              {/* Label background */}
              <Rect
                x={pixelX1}
                y={labelY}
                width={textWidth + 2 * LABEL_PADDING_X}
                height={LABEL_HEIGHT}
                color={color}
              />

              {/* Label text */}
              <SkiaText
                x={pixelX1 + LABEL_PADDING_X}
                y={labelY + LABEL_HEIGHT - LABEL_PADDING_Y}
                text={label}
                color="white"
                font={FONT}
              />
            </Group>
          );
        })}
      </Group>
    </Canvas>
  );
};
