# pk_load_image_paste v7 - node implementation using STRING input to avoid 'Value not in list' issues
import os
import folder_paths

class PK_LoadImage_Paste:
    """Load an image (path relative to input/ or absolute) and output (IMAGE, MASK)."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("STRING", {
                    "default": "",
                    "placeholder": "e.g. pasted/xxx.png or input/xxx.png",
                })
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "load"
    CATEGORY = "image"

    def load(self, image: str):
        from PIL import Image, ImageOps
        import numpy as np
        import torch

        if not image or not isinstance(image, str):
            raise ValueError("image path is empty")

        base = folder_paths.get_input_directory()
        # allow absolute or relative-to-input paths
        if os.path.isabs(image):
            path = image
        else:
            # strip leading separators or 'input/' prefix for safety
            sanitized = image.strip().lstrip("/\\")
            if sanitized.startswith("input/") or sanitized.startswith("input\\"):
                sanitized = sanitized.split("/", 1)[1] if "/" in sanitized else sanitized.split("\\", 1)[1]
            path = os.path.join(base, sanitized)

        if not os.path.exists(path):
            raise FileNotFoundError(f"Image not found: {path}")

        img = Image.open(path)
        img = ImageOps.exif_transpose(img)

        if img.mode == "I;16":
            img = img.point(lambda i: i * (1 / 257)).convert("L")

        if img.mode == "RGBA":
            a = img.getchannel("A")
            mask_np = 1.0 - (np.asarray(a, dtype=np.float32) / 255.0)
            img = img.convert("RGB")
        else:
            mask_np = np.zeros((img.height, img.width), dtype=np.float32)

        arr = np.asarray(img, dtype=np.float32) / 255.0
        if arr.ndim == 2:
            arr = np.expand_dims(arr, 2)

        image_t = torch.from_numpy(arr)[None, ...]
        mask_t  = torch.from_numpy(mask_np)[None, None, ...]
        return (image_t, mask_t)
