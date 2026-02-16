"""Pydantic models for the LUXEPLAN Vision API."""

from pydantic import BaseModel
from typing import Optional


class AnchorPoint(BaseModel):
    id: str
    label: str
    x: float
    y: float
    width: float
    height: float
    confidence: float
    plane: str  # wall, floor, countertop, ceiling


class SegmentationMask(BaseModel):
    label: str
    mask_url: str
    polygon: list[list[float]]
    area: float


class PlaneInfo(BaseModel):
    label: str
    normal: list[float]  # [x, y, z]
    distance: float
    bounds: dict  # {x, y, width, height}


class VisionAnalysisResponse(BaseModel):
    image_id: str
    width: int
    height: int
    segments: list[SegmentationMask]
    anchors: list[AnchorPoint]
    depth_map_url: str
    planes: list[PlaneInfo]
    room_type: str


class PlacementRequest(BaseModel):
    category: str
    asset_width: int
    asset_height: int
    anchors: list[AnchorPoint]
    depth_map_url: str
    image_width: int
    image_height: int
    target_anchor_label: Optional[str] = None


class PlacementResult(BaseModel):
    x: float
    y: float
    scale: float
    rotation: float
    z_order: int
    shadow_plane: str
    occlusion_mask: Optional[str] = None


class GeminiGuidanceRequest(BaseModel):
    image_url: str
    room_type: str
    current_selections: list[dict]
    style_preferences: Optional[list[str]] = None


class GeminiGuidanceResponse(BaseModel):
    style_summary: str
    color_palette: list[str]
    recommended_product_ids: list[str]
    budget_warnings: list[str]


class ConceptRenderRequest(BaseModel):
    original_image_url: str
    segmentation_masks: list[dict]
    current_design_state: dict
    requested_change: str


class ConceptRenderResponse(BaseModel):
    render_url: str
    changes_summary: list[str]


class AssetPrepRequest(BaseModel):
    image_url: str
    product_id: str


class AssetPrepResponse(BaseModel):
    alpha_png_url: str
    pose_rating: int
    is_insertion_ready: bool
    rejection_reason: Optional[str] = None
