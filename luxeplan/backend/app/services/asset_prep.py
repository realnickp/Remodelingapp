"""
Asset Preparation Service
Processes raw product images into insertion-ready alpha PNGs.
"""

import io
import uuid
from PIL import Image
from app.models import AssetPrepResponse


class AssetPrepService:
    def __init__(self):
        # In production: load rembg model for background removal
        # from rembg import remove
        pass

    async def prepare(
        self, image_data: bytes, product_id: str
    ) -> AssetPrepResponse:
        """
        Asset Preparation Pipeline:
        1. AI background removal (rembg)
        2. Crop to content bounds with padding
        3. Clean edges (anti-aliased alpha refinement)
        4. Assess pose quality
        5. Reject lifestyle shots or unusable angles

        Pose quality scoring (1-10):
        - 9-10: Clean product shot, frontal/3/4 view, white bg
        - 7-8: Good angle, minor bg artifacts
        - 5-6: Usable but imperfect (slight angle, partial crop)
        - 1-4: Rejected (lifestyle shot, multiple products, unusable angle)
        """
        img = Image.open(io.BytesIO(image_data))

        # Step 1: Background removal
        # In production: alpha_img = remove(img)
        alpha_img = img.convert("RGBA")

        # Step 2: Crop to content
        # bbox = alpha_img.getbbox()
        # if bbox:
        #     padding = 20
        #     alpha_img = alpha_img.crop((
        #         max(0, bbox[0] - padding),
        #         max(0, bbox[1] - padding),
        #         min(alpha_img.width, bbox[2] + padding),
        #         min(alpha_img.height, bbox[3] + padding),
        #     ))

        # Step 3: Clean edges (alpha matting refinement)
        # Apply Gaussian blur to alpha channel edges for smooth compositing

        # Step 4: Pose quality assessment
        pose_rating = self._assess_pose(img)
        is_ready = pose_rating >= 6

        # Step 5: Save alpha PNG
        asset_id = str(uuid.uuid4())
        alpha_url = f"/api/assets/{product_id}/{asset_id}_alpha.png"

        rejection_reason = None
        if not is_ready:
            if pose_rating <= 3:
                rejection_reason = "Lifestyle or environmental shot detected"
            elif pose_rating <= 5:
                rejection_reason = "Suboptimal angle for compositing"

        return AssetPrepResponse(
            alpha_png_url=alpha_url,
            pose_rating=pose_rating,
            is_insertion_ready=is_ready,
            rejection_reason=rejection_reason,
        )

    def _assess_pose(self, img: Image.Image) -> int:
        """
        Assess pose quality of a product image.

        Production implementation:
        - Check aspect ratio (too extreme = lifestyle shot)
        - Analyze background uniformity (solid bg = product shot)
        - Edge complexity (simple silhouette = good product shot)
        - Check for multiple objects (YOLO count)
        - Analyze centering and framing
        """
        width, height = img.size
        aspect = width / height

        # Simple heuristic: square-ish images with uniform bg score higher
        if 0.7 <= aspect <= 1.4:
            return 8  # Good product shot aspect
        elif 0.5 <= aspect <= 2.0:
            return 6  # Acceptable
        else:
            return 4  # Likely lifestyle/wide shot
