# LuxePlan Vision Microservice

A lightweight FastAPI service providing computer-vision endpoints for the LuxePlan studio.

## Quick Start

```bash
cd apps/vision
pip install -r requirements.txt
uvicorn main:app --reload --port 8100
```

The service runs on `http://localhost:8100`.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/vision/segment` | POST | Returns segmentation masks for surface regions (flooring, countertops, backsplash, cabinets, wall paint) |
| `/vision/anchors` | POST | Returns anchor points for fixture placement (faucets, sinks, shower, lighting, mirrors) |
| `/vision/depth` | POST | Returns a grayscale depth map |
| `/vision/matte` | POST | Returns an alpha matte for a detected fixture |
| `/vision/inpaint` | POST | Inpaints a masked region of the image |

All endpoints accept a multipart `image` file upload. See `main.py` for full parameter details.

## Production Upgrades

Each endpoint has a `TODO` marker indicating where to swap in real ML models:

- **Segment**: Meta SAM-2, SegGPT, or OneFormer
- **Anchors**: YOLOv8 fine-tuned on kitchen/bath fixtures
- **Depth**: MiDaS or Depth Anything V2
- **Matte**: ViTMatte or MODNet
- **Inpaint**: LaMa, Stable Diffusion inpaint, or OpenAI images/edits
