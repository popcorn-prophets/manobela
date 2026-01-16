import cv2
import numpy as np


def letterbox(
    img: np.ndarray,
    new_size: int,
    color: tuple[int, int, int] = (114, 114, 114),
) -> tuple[np.ndarray, float, tuple[int, int]]:
    """
    Resize image with unchanged aspect ratio using padding (letterboxing).

    Args:
        img: Input image as a NumPy array (H x W x C, BGR format).
        new_size: Target size for the output image (square, e.g., 640).
        color: Padding color as RGB tuple. Default is gray (114,114,114).

    Returns:
        padded: Resized and padded image.
        scale: Scaling factor applied to original image.
        pad: Tuple of (pad_left, pad_top) applied to width and height.
    """

    # Original image height and width
    h, w = img.shape[:2]

    # Compute scaling factor to fit image inside new_size while preserving aspect ratio
    scale = min(new_size / w, new_size / h)

    # Compute new width and height after scaling
    nw, nh = int(w * scale), int(h * scale)

    # Resize image to new width and height
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR)

    # Compute padding to make final image exactly new_size x new_size
    pad_w = new_size - nw  # total width padding
    pad_h = new_size - nh  # total height padding
    pad_left = pad_w // 2  # pad on left side
    pad_top = pad_h // 2  # pad on top side

    # Apply padding using copyMakeBorder
    # Arguments: image, top, bottom, left, right, border type, color
    padded = cv2.copyMakeBorder(
        resized,
        pad_top,
        pad_h - pad_top,
        pad_left,
        pad_w - pad_left,
        cv2.BORDER_CONSTANT,
        value=color,
    )

    # Return padded image, scaling factor, and top-left padding
    return padded, scale, (pad_left, pad_top)
