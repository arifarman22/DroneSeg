import numpy as np
import cv2
from PIL import Image
from pathlib import Path
from io import BytesIO
import torch
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from app.core.config import get_settings
from app.core.logging import logger

# ADE20K 150-class labels (SegFormer-B0 default)
ADE20K_CLASSES = [
    "wall", "building", "sky", "floor", "tree", "ceiling", "road", "bed",
    "windowpane", "grass", "cabinet", "sidewalk", "person", "earth",
    "door", "table", "mountain", "plant", "curtain", "chair", "car",
    "water", "painting", "sofa", "shelf", "house", "sea", "mirror",
    "rug", "field", "armchair", "seat", "fence", "desk", "rock",
    "wardrobe", "lamp", "bathtub", "railing", "cushion", "base",
    "box", "column", "signboard", "chest of drawers", "counter",
    "sand", "sink", "skyscraper", "fireplace", "refrigerator", "grandstand",
    "path", "stairs", "runway", "case", "pool table", "pillow", "screen door",
    "stairway", "river", "bridge", "bookcase", "blind", "coffee table",
    "toilet", "flower", "book", "hill", "bench", "countertop", "stove",
    "palm", "kitchen island", "computer", "swivel chair", "boat", "bar",
    "arcade machine", "hovel", "bus", "towel", "light", "truck", "tower",
    "chandelier", "awning", "streetlight", "booth", "television", "airplane",
    "dirt track", "apparel", "pole", "land", "bannister", "escalator",
    "ottoman", "bottle", "buffet", "poster", "stage", "van", "ship",
    "fountain", "conveyer belt", "canopy", "washer", "plaything",
    "swimming pool", "stool", "barrel", "basket", "waterfall", "tent",
    "bag", "minibike", "cradle", "oven", "ball", "food", "step", "tank",
    "trade name", "microwave", "pot", "animal", "bicycle", "lake",
    "dishwasher", "screen", "blanket", "sculpture", "hood", "sconce",
    "vase", "traffic light", "tray", "ashcan", "fan", "pier",
    "crt screen", "plate", "monitor", "bulletin board", "shower",
    "radiator", "glass", "clock", "flag",
]

# Generate a fixed color palette for 150 classes
np.random.seed(42)
ADE20K_PALETTE = [(int(r), int(g), int(b)) for r, g, b in np.random.randint(0, 255, size=(150, 3))]


class SegmentationService:
    """Loads a HuggingFace SegFormer model and runs semantic segmentation."""

    def __init__(self):
        self._model = None
        self._processor = None
        self._device = None
        self._loaded = False
        self._load_error: str | None = None

    def load_model(self) -> None:
        """Load model at startup. Call once during app lifespan."""
        settings = get_settings()
        model_name = settings.model_name
        try:
            logger.info(f"Loading segmentation model: {model_name}")
            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info(f"Using device: {self._device}")

            self._processor = SegformerImageProcessor.from_pretrained(model_name)
            self._model = SegformerForSemanticSegmentation.from_pretrained(model_name)
            self._model.to(self._device)
            self._model.eval()

            self._loaded = True
            logger.info("Segmentation model loaded successfully")
        except Exception as e:
            self._load_error = f"Failed to load model '{model_name}': {e}"
            logger.error(self._load_error)
            raise RuntimeError(self._load_error)

    @property
    def is_ready(self) -> bool:
        return self._loaded

    def _resize_if_needed(self, image: Image.Image) -> Image.Image:
        """Resize large images to prevent OOM during inference."""
        settings = get_settings()
        max_dim = settings.max_inference_size
        w, h = image.size
        if max(w, h) <= max_dim:
            return image
        scale = max_dim / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        logger.info(f"Resizing image from {w}x{h} to {new_w}x{new_h} for inference")
        return image.resize((new_w, new_h), Image.LANCZOS)

    def run_inference(self, image_path: Path) -> dict:
        """
        Run segmentation and return structured result.

        Returns dict with keys:
            mask_png: bytes - colorized segmentation mask
            width: int
            height: int
            classes: list[dict] - per-class info with bbox, area, confidence
        """
        if not self._loaded:
            raise RuntimeError(self._load_error or "Model not loaded. Call load_model() first.")

        original = Image.open(image_path).convert("RGB")
        orig_w, orig_h = original.size

        # Resize for safe inference
        resized = self._resize_if_needed(original)
        inf_w, inf_h = resized.size

        # Run model
        inputs = self._processor(images=resized, return_tensors="pt").to(self._device)
        with torch.no_grad():
            outputs = self._model(**inputs)

        # Upsample logits to original resolution
        logits = outputs.logits  # (1, num_classes, H/4, W/4)
        upsampled = torch.nn.functional.interpolate(
            logits, size=(orig_h, orig_w), mode="bilinear", align_corners=False
        )

        # Confidence map (softmax) and prediction
        probs = torch.softmax(upsampled, dim=1)
        confidence_map = probs.max(dim=1).values.squeeze().cpu().numpy()
        pred = upsampled.argmax(dim=1).squeeze().cpu().numpy().astype(np.uint8)

        # Build colorized mask
        color_mask = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
        total_pixels = orig_h * orig_w
        classes_result = []

        for cls_id in np.unique(pred):
            if cls_id >= len(ADE20K_CLASSES):
                continue

            binary_mask = (pred == cls_id).astype(np.uint8)
            pixel_count = int(binary_mask.sum())
            if pixel_count == 0:
                continue

            # Color the mask
            color = ADE20K_PALETTE[cls_id]
            color_mask[binary_mask == 1] = color

            # Mean confidence for this class
            class_confidence = float(confidence_map[binary_mask == 1].mean())

            # Bounding box via OpenCV contours
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            bboxes = []
            for cnt in contours:
                x, y, bw, bh = cv2.boundingRect(cnt)
                if bw * bh > 100:  # filter noise
                    bboxes.append({"x": int(x), "y": int(y), "width": int(bw), "height": int(bh)})

            classes_result.append({
                "class_id": int(cls_id),
                "class_name": ADE20K_CLASSES[cls_id],
                "confidence": round(class_confidence, 4),
                "pixel_count": pixel_count,
                "percentage": round(pixel_count / total_pixels * 100, 2),
                "color": list(color),
                "bounding_boxes": bboxes,
            })

        # Sort by pixel area descending
        classes_result.sort(key=lambda c: c["pixel_count"], reverse=True)

        # Encode mask to PNG
        mask_image = Image.fromarray(color_mask)
        buf = BytesIO()
        mask_image.save(buf, format="PNG")

        return {
            "mask_png": buf.getvalue(),
            "width": orig_w,
            "height": orig_h,
            "classes": classes_result,
        }


segmentation_service = SegmentationService()
