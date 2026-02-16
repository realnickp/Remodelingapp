import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp-image-generation";

interface DetectedObjectInfo {
  label: string;
  category?: string;
  region: { x: number; y: number; width: number; height: number };
}

interface ChatEditBody {
  roomImageBase64?: string;
  originalImageBase64?: string;
  prompt?: string;
  region?: { x: number; y: number; width: number; height: number };
  replacementImageBase64?: string;
  detectedObjects?: DetectedObjectInfo[];
  targetCategory?: string;
  targetLabel?: string;
  targetProductName?: string;
}

/**
 * POST /api/chat-edit
 *
 * Accepts a room image, a natural-language edit prompt, detected objects
 * inventory, and an optional region. Sends to Gemini for TARGETED image editing.
 */
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Set it in .env.local." },
      { status: 500 }
    );
  }

  let body: ChatEditBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomImageBase64, prompt, region, replacementImageBase64, detectedObjects, targetCategory, targetLabel, targetProductName } = body;

  if (!roomImageBase64) {
    return NextResponse.json({ error: "roomImageBase64 is required" }, { status: 400 });
  }
  if (!prompt && !replacementImageBase64) {
    return NextResponse.json({ error: "prompt or replacementImageBase64 is required" }, { status: 400 });
  }

  const stripDataUrl = (b64: string) => {
    if (b64.startsWith("data:")) {
      const idx = b64.indexOf(",");
      return idx >= 0 ? b64.slice(idx + 1) : b64;
    }
    return b64;
  };

  const rawBase64 = stripDataUrl(roomImageBase64);

  // Build room inventory from detected objects
  let inventoryBlock = "";
  if (detectedObjects && detectedObjects.length > 0) {
    const lines = detectedObjects.map((obj) => {
      const x = Math.round(obj.region.x * 100);
      const y = Math.round(obj.region.y * 100);
      const w = Math.round(obj.region.width * 100);
      const h = Math.round(obj.region.height * 100);
      return `  - ${obj.label} (${obj.category || "unknown"}) at [${x}%,${y}% → ${x + w}%,${y + h}%]`;
    });
    inventoryBlock = `
ROOM INVENTORY (detected elements and their locations):
${lines.join("\n")}

Use this inventory to understand what exists in the room. When the user refers to an element (e.g. "the countertop", "the cabinets", "the floor"), match it to the correct item above and ONLY modify pixels within that element's bounding region.`;
  }

  // Build target element constraint: only this one thing may be changed
  let targetElementBlock = "";
  if (targetCategory || targetLabel) {
    const part = targetLabel
      ? `ONLY the ${targetLabel}${targetProductName ? ` (product: ${targetProductName})` : ""}`
      : `ONLY the element in category "${targetCategory}"`;
    targetElementBlock = `
TARGET ELEMENT (CRITICAL): The user is editing ${part}. You must change ONLY this element and nothing else.
- Do NOT alter countertops, cabinets, flooring, backsplash, walls, appliances, lighting, or any other surface or fixture.
- Every other part of the image must remain pixel-identical to the input. No global lighting changes, no color grading, no "improvements" to unmentioned areas.`;
  }

  // Build region description
  let regionInstruction = "";
  if (region) {
    const x = Math.round(region.x * 100);
    const y = Math.round(region.y * 100);
    const w = Math.round(region.width * 100);
    const h = Math.round(region.height * 100);
    regionInstruction = `
TARGET REGION: The user has selected a specific area at top-left (${x}%, ${y}%) spanning ${w}% x ${h}% of the image.
ONLY modify pixels inside this region. Every pixel outside this bounding box must remain IDENTICAL to the input — no color shifts, no lighting changes, no texture alterations, no blur, no sharpening. Treat the area outside the region as a frozen mask.`;
  }

  // Build replacement image instruction
  let replacementInstruction = "";
  if (replacementImageBase64) {
    replacementInstruction = `
PRODUCT REPLACEMENT: The second image is a reference photo of the replacement product/material. Replace the content in the target region with this product. Match the room's existing:
- Perspective and vanishing points
- Lighting direction, intensity, and color temperature
- Shadow angles and ambient occlusion
- Reflection characteristics of surrounding surfaces
- Scale relative to adjacent elements`;
  }

  const effectivePrompt = prompt || "Replace the selected region with the product shown in the attached image.";

  const promptText = `You are an expert photorealistic interior design editor specializing in surgical, targeted image modifications. You produce output indistinguishable from professional architectural photography.

The attached image is a room photograph. Apply this edit:

"${effectivePrompt}"
${targetElementBlock}${inventoryBlock}${regionInstruction}${replacementInstruction}

PHOTOREALISM REQUIREMENTS:
- Match the existing photograph's color grading, white balance, and exposure exactly
- Preserve all lens characteristics: depth of field, barrel distortion, vignetting
- Maintain consistent lighting: direction of key light, fill light ratios, ambient bounce
- Render materials with physically accurate properties: specular highlights, diffuse reflection, subsurface scattering for marble/stone
- Add appropriate contact shadows where new materials meet existing surfaces
- Ensure grain/noise consistency matches the original photograph's ISO characteristics
- Transition edges between modified and unmodified areas must be seamless — no visible seams, halos, or color discontinuities

SURGICAL EDIT RULES:
- This is a TARGETED edit. ONLY change what the user specifically asked to change.
- DO NOT alter, adjust, shift, or "improve" ANY element the user did not mention.
- The camera angle, field of view, framing, and aspect ratio must remain PIXEL-IDENTICAL.
- All unmentioned surfaces, fixtures, objects, walls, floors, lighting, and decor must be preserved exactly as they appear in the input.
- If changing a surface material (e.g. countertop), the new material must follow the exact same 3D surface geometry, perspective, and edge boundaries as the original.
- No text, watermarks, or logos.
- Output a single edited room image at the same resolution as the input.`;

  try {
    const parts: Array<Record<string, unknown>> = [
      { inlineData: { mimeType: "image/png", data: rawBase64 } },
    ];

    if (replacementImageBase64) {
      const replacementBase64 = stripDataUrl(replacementImageBase64);
      parts.push({ inlineData: { mimeType: "image/png", data: replacementBase64 } });
    }

    parts.push({ text: promptText });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[chat-edit] Gemini API failed:", res.status, err);
      return NextResponse.json(
        { error: `Gemini API failed: ${res.status} ${err}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
        };
      }>;
    };

    const responseParts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = responseParts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const textPart = responseParts.find((p) => p.text);
      return NextResponse.json(
        { error: textPart?.text || "No image returned from Gemini" },
        { status: 502 }
      );
    }

    return NextResponse.json({ imageBase64: imagePart.inlineData.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[chat-edit] Error:", message, e instanceof Error ? e.stack : "");
    return NextResponse.json(
      { error: `Chat edit failed: ${message}` },
      { status: 500 }
    );
  }
}
