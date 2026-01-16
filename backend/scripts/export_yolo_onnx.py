"""
Export YOLOv8 model to ONNX format.
Only used for exporting the model.
"""

import shutil
from pathlib import Path

from ultralytics import YOLO

# Load YOLO pre-trained model
model = YOLO("yolov8s.pt")

# Export to ONNX
exported_path_str = model.export(
    format="onnx",
    opset=12,
    dynamic=False,  # fixed input shape
)

exported_path = Path(exported_path_str)  # convert to Path object

# Move to desired folder
output_folder = Path(__file__).resolve().parents[1] / "assets/models"
output_folder.mkdir(parents=True, exist_ok=True)

shutil.move(str(exported_path), output_folder / exported_path.name)

print(f"ONNX model exported to: {output_folder / exported_path.name}")
