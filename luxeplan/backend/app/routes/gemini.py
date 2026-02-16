"""
Gemini AI Integration Routes
Design guidance and concept render modes.
"""

from fastapi import APIRouter
from app.models import (
    GeminiGuidanceRequest,
    GeminiGuidanceResponse,
    ConceptRenderRequest,
    ConceptRenderResponse,
)
from app.services.gemini_service import GeminiService

router = APIRouter()
gemini = GeminiService()


@router.post("/guidance", response_model=GeminiGuidanceResponse)
async def get_design_guidance(request: GeminiGuidanceRequest):
    """
    Design Guidance Mode:
    Returns structured JSON with style summary, color palette,
    recommended products, and budget warnings.
    """
    return await gemini.get_guidance(
        image_url=request.image_url,
        room_type=request.room_type,
        current_selections=request.current_selections,
        style_preferences=request.style_preferences,
    )


@router.post("/concept-render", response_model=ConceptRenderResponse)
async def generate_concept_render(request: ConceptRenderRequest):
    """
    Concept Render Mode:
    Generates a high-end photoreal image using Gemini when live
    compositing isn't sufficient for credible insertion.
    """
    return await gemini.generate_concept_render(
        original_image_url=request.original_image_url,
        segmentation_masks=request.segmentation_masks,
        current_design_state=request.current_design_state,
        requested_change=request.requested_change,
    )
