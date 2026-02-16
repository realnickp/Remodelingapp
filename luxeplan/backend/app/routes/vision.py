"""
Vision Pipeline Routes
Handles image analysis: segmentation, object detection, depth estimation, plane inference.
"""

import uuid
from fastapi import APIRouter, UploadFile, File
from PIL import Image
import io
import numpy as np

from app.models import (
    VisionAnalysisResponse,
    SegmentationMask,
    AnchorPoint,
    PlaneInfo,
)
from app.services.segmentation import SegmentationService
from app.services.detection import ObjectDetectionService
from app.services.depth import DepthEstimationService

router = APIRouter()

segmentation_service = SegmentationService()
detection_service = ObjectDetectionService()
depth_service = DepthEstimationService()


@router.post("/analyze", response_model=VisionAnalysisResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    Full vision pipeline:
    1. Segmentation (walls, floor, cabinets, countertop, backsplash, etc.)
    2. Object detection (sink, faucet, stove, fridge, etc.)
    3. Monocular depth estimation
    4. Planar surface inference
    """
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    width, height = img.size
    image_id = str(uuid.uuid4())

    # Run segmentation
    segments = await segmentation_service.segment(img, image_id)

    # Run object detection
    anchors = await detection_service.detect(img, image_id)

    # Run depth estimation
    depth_map_url = await depth_service.estimate(img, image_id)

    # Infer planes from segments and depth
    planes = infer_planes(segments, width, height)

    # Classify room type
    room_type = classify_room(anchors)

    return VisionAnalysisResponse(
        image_id=image_id,
        width=width,
        height=height,
        segments=segments,
        anchors=anchors,
        depth_map_url=depth_map_url,
        planes=planes,
        room_type=room_type,
    )


def infer_planes(
    segments: list[SegmentationMask], width: int, height: int
) -> list[PlaneInfo]:
    """Infer planar surfaces from segmentation masks."""
    planes = []

    segment_labels = {s.label for s in segments}

    if "wall" in segment_labels:
        wall_seg = next(s for s in segments if s.label == "wall")
        planes.append(
            PlaneInfo(
                label="wall",
                normal=[0.0, 0.0, 1.0],
                distance=1.0,
                bounds={"x": 0, "y": 0, "width": width, "height": int(height * 0.6)},
            )
        )

    if "floor" in segment_labels:
        planes.append(
            PlaneInfo(
                label="floor",
                normal=[0.0, 1.0, 0.0],
                distance=0.0,
                bounds={
                    "x": 0,
                    "y": int(height * 0.65),
                    "width": width,
                    "height": int(height * 0.35),
                },
            )
        )

    if "countertop" in segment_labels:
        counter_seg = next(s for s in segments if s.label == "countertop")
        planes.append(
            PlaneInfo(
                label="countertop",
                normal=[0.0, 1.0, 0.0],
                distance=0.85,
                bounds={
                    "x": 0,
                    "y": int(height * 0.4),
                    "width": width,
                    "height": int(height * 0.15),
                },
            )
        )

    if "ceiling" in segment_labels:
        planes.append(
            PlaneInfo(
                label="ceiling",
                normal=[0.0, -1.0, 0.0],
                distance=2.4,
                bounds={"x": 0, "y": 0, "width": width, "height": int(height * 0.1)},
            )
        )

    return planes


def classify_room(anchors: list[AnchorPoint]) -> str:
    """Classify room type based on detected objects."""
    kitchen_anchors = {"stove", "fridge", "oven", "dishwasher", "range_hood"}
    bathroom_anchors = {"toilet", "bathtub", "shower_head", "vanity"}

    labels = {a.label for a in anchors}
    kitchen_score = len(labels & kitchen_anchors)
    bathroom_score = len(labels & bathroom_anchors)

    return "bathroom" if bathroom_score > kitchen_score else "kitchen"
