"""
Asset Preparation Routes
Background removal, edge cleaning, pose quality assessment.
"""

from fastapi import APIRouter, UploadFile, File
from app.models import AssetPrepResponse
from app.services.asset_prep import AssetPrepService

router = APIRouter()
prep_service = AssetPrepService()


@router.post("/prepare", response_model=AssetPrepResponse)
async def prepare_asset(product_id: str, file: UploadFile = File(...)):
    """
    Asset Preparation Pipeline:
    1. AI background removal
    2. Crop and clean edges
    3. Detect pose quality
    4. Reject lifestyle shots or unusable angles
    5. Return alpha PNG and pose rating
    """
    contents = await file.read()
    return await prep_service.prepare(
        image_data=contents,
        product_id=product_id,
    )
