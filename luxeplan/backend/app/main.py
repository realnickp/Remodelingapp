"""
LUXEPLAN Vision & Compositing Microservice
FastAPI backend for image analysis, placement engine, and AI rendering.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import vision, placement, gemini, assets

app = FastAPI(
    title="LUXEPLAN Vision API",
    version="1.0.0",
    description="AI vision pipeline for luxury kitchen & bath design",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision.router, prefix="/api/vision", tags=["Vision Pipeline"])
app.include_router(placement.router, prefix="/api/placement", tags=["Placement Engine"])
app.include_router(gemini.router, prefix="/api/gemini", tags=["Gemini AI"])
app.include_router(assets.router, prefix="/api/assets", tags=["Asset Preparation"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "luxeplan-vision"}
