"""
Placement Engine Routes
Auto-placement of products based on vision analysis results.
"""

from fastapi import APIRouter
from app.models import PlacementRequest, PlacementResult
from app.services.placement_engine import PlacementEngine

router = APIRouter()
engine = PlacementEngine()


@router.post("/compute", response_model=PlacementResult)
async def compute_placement(request: PlacementRequest):
    """
    Compute optimal placement for a product given the scene analysis.
    Returns position, scale, rotation, z-order, shadow plane, and occlusion mask.
    """
    result = engine.compute(
        category=request.category,
        asset_width=request.asset_width,
        asset_height=request.asset_height,
        anchors=request.anchors,
        depth_map_url=request.depth_map_url,
        image_width=request.image_width,
        image_height=request.image_height,
        target_anchor_label=request.target_anchor_label,
    )
    return result
