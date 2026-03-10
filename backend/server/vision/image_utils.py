"""
image_utils.py — Image loading and preprocessing utilities.

Handles decoding raw bytes from multipart uploads and resizing
images to a standard processing size.
"""

import cv2
import numpy as np


# Default processing resolution — 512×512 gives finer-grained stress grid
# while still completing in < 500ms on a typical server CPU.
PROCESS_SIZE = (512, 512)


def load_image_from_bytes(data: bytes) -> np.ndarray:
    """
    Decode raw image bytes (from file upload) into an OpenCV BGR array.

    Args:
        data: Raw bytes of the image file (JPEG, PNG, etc.)

    Returns:
        np.ndarray of shape (H, W, 3) in BGR color order.

    Raises:
        ValueError: If the bytes cannot be decoded as a valid image.
    """
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Ensure the file is a valid JPEG or PNG.")
    return img


def resize_image(img: np.ndarray, size: tuple = PROCESS_SIZE) -> np.ndarray:
    """
    Resize an image to the target processing resolution.

    Args:
        img:  Input BGR image array.
        size: Target (width, height) tuple. Default: 512×512.

    Returns:
        Resized BGR image array.
    """
    return cv2.resize(img, size, interpolation=cv2.INTER_AREA)


def bgr_to_rgb_float(img: np.ndarray) -> tuple:
    """
    Split a BGR image into R, G, B float32 channel arrays normalised to [0, 255].

    OpenCV stores images in BGR order; vegetation index formulas use RGB.

    Args:
        img: BGR uint8 image array.

    Returns:
        Tuple of (R, G, B) float32 arrays each with shape (H, W).
    """
    img_f = img.astype(np.float32)
    B = img_f[:, :, 0]   # OpenCV channel 0 = Blue
    G = img_f[:, :, 1]   # OpenCV channel 1 = Green
    R = img_f[:, :, 2]   # OpenCV channel 2 = Red
    return R, G, B
