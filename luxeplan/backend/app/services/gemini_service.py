"""
Gemini AI Service
Two modes: Design Guidance (structured JSON) and Concept Render (photoreal image).
"""

import os
import json
from typing import Optional
from app.models import GeminiGuidanceResponse, ConceptRenderResponse


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        # In production: initialize google.generativeai
        # genai.configure(api_key=self.api_key)
        # self.model = genai.GenerativeModel("gemini-2.0-flash")

    async def get_guidance(
        self,
        image_url: str,
        room_type: str,
        current_selections: list[dict],
        style_preferences: Optional[list[str]] = None,
    ) -> GeminiGuidanceResponse:
        """
        Design Guidance Mode.
        Sends room photo and current state to Gemini.
        Returns structured JSON with recommendations.

        Production prompt:
        "Analyze this {room_type} photo. Current selections: {selections}.
         Style preferences: {preferences}.
         Return ONLY valid JSON with:
         - style_summary: 2-sentence design direction
         - color_palette: array of 5 hex colors that complement the space
         - recommended_product_ids: array of product IDs from catalog
         - budget_warnings: array of cost concerns"
        """
        # Development stub
        return GeminiGuidanceResponse(
            style_summary=(
                "This space has strong potential for a warm contemporary aesthetic. "
                "Consider pairing natural stone surfaces with brass hardware "
                "for an elevated yet inviting atmosphere."
            ),
            color_palette=["#E8E2DB", "#8B7355", "#2D2925", "#C4BBB2", "#5A7A5E"],
            recommended_product_ids=[
                "counter-001",
                "faucet-003",
                "back-001",
                "cab-002",
                "light-001",
            ],
            budget_warnings=[
                "Calacatta marble countertops will significantly increase material costs.",
                "Consider quartzite as a durable alternative with similar aesthetics.",
            ],
        )

    async def generate_concept_render(
        self,
        original_image_url: str,
        segmentation_masks: list[dict],
        current_design_state: dict,
        requested_change: str,
    ) -> ConceptRenderResponse:
        """
        Concept Render Mode.
        When live compositing can't credibly insert a product, generate
        a cinematic photoreal render using Gemini's image generation.

        Production flow:
        1. Send original image + masks + design state to Gemini
        2. Prompt for photorealistic interior design rendering
        3. Return the generated image URL and change summary
        """
        # Development stub
        return ConceptRenderResponse(
            render_url="/api/renders/concept_placeholder.jpg",
            changes_summary=[
                f"Applied {requested_change}",
                "Adjusted lighting to match new materials",
                "Updated reflections and shadows for realism",
            ],
        )
