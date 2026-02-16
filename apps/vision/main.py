"""
LuxePlan Vision Microservice
FastAPI server providing computer-vision endpoints for the studio.

Run locally:
    cd apps/vision
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8100

All endpoints return valid data formats immediately using lightweight
heuristic / procedural implementations. TODO markers indicate where to
swap in real ML models (SAM, MiDaS, etc.) for production quality.
"""

from __future__ import annotations

import base64
import io
import math
import uuid
from typing import Optional

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw, ImageFilter

app = FastAPI(title="LuxePlan Vision", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decode_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGBA")


def _image_to_b64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode()


# Proportional regions matching the front-end getSurfaceRegion
SURFACE_REGIONS: dict[str, tuple[float, float, float, float]] = {
    # (y_start_pct, y_end_pct, x_start_pct, x_end_pct)
    "flooring":     (0.60, 1.00, 0.00, 1.00),
    "countertops":  (0.38, 0.52, 0.00, 1.00),
    "backsplash":   (0.18, 0.38, 0.00, 1.00),
    "cabinets":     (0.52, 0.66, 0.00, 1.00),
    "wall_paint":   (0.00, 0.18, 0.00, 1.00),
}

FIXTURE_ANCHORS: dict[str, dict] = {
    "faucets":   {"x": 0.50, "y": 0.36, "width": 0.10, "height": 0.14, "plane": "countertop"},
    "sinks":     {"x": 0.50, "y": 0.44, "width": 0.18, "height": 0.12, "plane": "countertop"},
    "shower":    {"x": 0.50, "y": 0.25, "width": 0.12, "height": 0.20, "plane": "wall"},
    "lighting":  {"x": 0.50, "y": 0.08, "width": 0.10, "height": 0.12, "plane": "ceiling"},
    "mirrors":   {"x": 0.50, "y": 0.22, "width": 0.18, "height": 0.22, "plane": "wall"},
}


# ---------------------------------------------------------------------------
# POST /vision/segment
# ---------------------------------------------------------------------------

@app.post("/vision/segment")
async def segment(image: UploadFile = File(...)):
    """
    Return segmentation masks for known surface regions.

    TODO: Replace proportional-rectangle heuristic with a real
    segmentation model (e.g. Meta SAM-2, SegGPT, or OneFormer).
    The response format stays the same.
    """
    data = await image.read()
    img = _decode_image(data)
    w, h = img.size

    masks: list[dict] = []
    for label, (y0p, y1p, x0p, x1p) in SURFACE_REGIONS.items():
        x0, y0 = int(x0p * w), int(y0p * h)
        x1, y1 = int(x1p * w), int(y1p * h)

        # Create a binary mask image (white = region)
        mask_img = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask_img)
        draw.rectangle([x0, y0, x1, y1], fill=255)

        # Feather edges slightly for blending
        mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=3))

        polygon = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
        area = (x1 - x0) * (y1 - y0)

        masks.append({
            "label": label,
            "mask_b64": _image_to_b64(mask_img),
            "polygon": polygon,
            "area": area,
            "bounds": {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0},
        })

    return {"width": w, "height": h, "masks": masks}


# ---------------------------------------------------------------------------
# POST /vision/anchors
# ---------------------------------------------------------------------------

@app.post("/vision/anchors")
async def anchors(image: UploadFile = File(...)):
    """
    Return anchor points for fixture placement.

    TODO: Replace heuristics with an object-detection model
    (e.g. YOLOv8 fine-tuned on kitchen/bath fixtures) to detect
    existing fixture locations.
    """
    data = await image.read()
    img = _decode_image(data)
    w, h = img.size

    points: list[dict] = []
    for label, info in FIXTURE_ANCHORS.items():
        points.append({
            "id": str(uuid.uuid4()),
            "label": label,
            "x": info["x"],
            "y": info["y"],
            "width": info["width"],
            "height": info["height"],
            "confidence": 0.85,
            "plane": info["plane"],
        })

    return {"width": w, "height": h, "anchors": points}


# ---------------------------------------------------------------------------
# POST /vision/depth
# ---------------------------------------------------------------------------

@app.post("/vision/depth")
async def depth(image: UploadFile = File(...)):
    """
    Return a grayscale depth map (brighter = closer).

    TODO: Replace gradient heuristic with MiDaS or Depth Anything V2.
    """
    data = await image.read()
    img = _decode_image(data)
    w, h = img.size

    # Simple vertical gradient: top is far (dark), bottom is near (bright)
    arr = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        val = int((y / h) * 200 + 55)  # 55..255
        arr[y, :] = val

    depth_img = Image.fromarray(arr, "L")
    return {
        "width": w,
        "height": h,
        "depth_b64": _image_to_b64(depth_img),
    }


# ---------------------------------------------------------------------------
# POST /vision/matte
# ---------------------------------------------------------------------------

@app.post("/vision/matte")
async def matte(image: UploadFile = File(...), label: str = Form("faucets")):
    """
    Return an alpha matte for a detected fixture (for removal / inpainting).

    TODO: Replace with a real matting model (ViTMatte, MODNet).
    """
    data = await image.read()
    img = _decode_image(data)
    w, h = img.size

    anchor = FIXTURE_ANCHORS.get(label, FIXTURE_ANCHORS["faucets"])
    cx, cy = int(anchor["x"] * w), int(anchor["y"] * h)
    rw, rh = int(anchor["width"] * w / 2), int(anchor["height"] * h / 2)

    matte_img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(matte_img)
    draw.ellipse([cx - rw, cy - rh, cx + rw, cy + rh], fill=255)
    matte_img = matte_img.filter(ImageFilter.GaussianBlur(radius=8))

    return {
        "width": w,
        "height": h,
        "matte_b64": _image_to_b64(matte_img),
    }


# ---------------------------------------------------------------------------
# POST /vision/inpaint
# ---------------------------------------------------------------------------

@app.post("/vision/inpaint")
async def inpaint(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form("Remove the object and fill with the surrounding background."),
):
    """
    Inpaint the masked region of the image.

    TODO: Replace with a real inpainting model (LaMa, Stable Diffusion
    inpaint, or call an external API like OpenAI images/edits).
    Current stub does a crude content-aware fill using Gaussian blur.
    """
    img_data = await image.read()
    mask_data = await mask.read()

    img = _decode_image(img_data).convert("RGB")
    mask_img = Image.open(io.BytesIO(mask_data)).convert("L")

    w, h = img.size
    mask_img = mask_img.resize((w, h))

    # Crude inpaint: blur the image heavily, paste blurred region where mask is white
    blurred = img.filter(ImageFilter.GaussianBlur(radius=30))
    mask_np = np.array(mask_img)
    img_np = np.array(img)
    blur_np = np.array(blurred)

    alpha = (mask_np.astype(np.float32) / 255.0)[:, :, np.newaxis]
    result = (img_np * (1 - alpha) + blur_np * alpha).astype(np.uint8)
    result_img = Image.fromarray(result)

    return {
        "width": w,
        "height": h,
        "image_b64": _image_to_b64(result_img),
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
async def health():
    return {"status": "ok", "service": "luxeplan-vision"}
