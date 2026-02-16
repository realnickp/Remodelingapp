import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getStyleById } from "@/lib/style-specs";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp-image-generation";

interface Selection {
  productName: string;
  category: string;
  material?: string;
  finish?: string;
  productImageBase64?: string;
}

/**
 * POST /api/concept-render
 *
 * Sends the base room image + design selections to Gemini and returns
 * a single photoreal concept image. Supports product reference images.
 */
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Set it in .env.local." },
      { status: 500 }
    );
  }

  let body: {
    roomImageBase64?: string;
    selections?: Selection[];
    instruction?: string;
    styleId?: string;
    styleSpec?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomImageBase64, selections = [], styleId, styleSpec: styleSpecRaw } = body;
  if (!roomImageBase64) {
    return NextResponse.json({ error: "roomImageBase64 is required" }, { status: 400 });
  }

  let rawBase64 = roomImageBase64;
  if (rawBase64.startsWith("data:")) {
    const idx = rawBase64.indexOf(",");
    rawBase64 = idx >= 0 ? rawBase64.slice(idx + 1) : rawBase64;
  }

  try {
    // Get input image dimensions so we can demand identical output size and framing
    let width = 0;
    let height = 0;
    try {
      const buf = Buffer.from(rawBase64, "base64");
      const meta = await sharp(buf).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    } catch {
      // ignore; prompt will not include dimensions
    }

    // Build the content parts: room image + product reference images + text prompt
    const parts: Array<Record<string, unknown>> = [];

    // Room image
    parts.push({
      inlineData: { mimeType: "image/png", data: rawBase64 },
    });

    // Product reference images (if provided)
    const surfaceCategories = ["flooring", "countertops", "backsplash", "cabinets", "wall_paint", "walls"];
    const surfaceSelections = selections.filter((s) =>
      surfaceCategories.includes(s.category)
    );
    const fixtureSelections = selections.filter(
      (s) => !surfaceCategories.includes(s.category)
    );

    for (const sel of surfaceSelections) {
      if (sel.productImageBase64) {
        let pBase64 = sel.productImageBase64;
        if (pBase64.startsWith("data:")) {
          const idx = pBase64.indexOf(",");
          pBase64 = idx >= 0 ? pBase64.slice(idx + 1) : pBase64;
        }
        parts.push({
          inlineData: { mimeType: "image/png", data: pBase64 },
        });
      }
    }

    // Style injection: list of materials/finishes to apply (from selections)
    const styleLines = selections.map((s) => {
      const detail = [s.productName];
      if (s.material) detail.push(s.material);
      if (s.finish) detail.push(s.finish);
      return `${s.category.replace(/_/g, " ")}: ${detail.join(", ")}`;
    });

    const hasRefImages = surfaceSelections.some((s) => s.productImageBase64);
    const refImageNote = hasRefImages
      ? " The following images are reference product/material samples; use their texture and finish where that category is listed below."
      : "";

    const resolvedStyleSpec = styleSpecRaw || (styleId ? getStyleById(styleId as Parameters<typeof getStyleById>[0])?.masterPromptSpec : undefined);
    const styleTitle = styleId ? getStyleById(styleId as Parameters<typeof getStyleById>[0])?.title : null;

    const dimensionLock =
      width > 0 && height > 0
        ? `DIMENSION LOCK: The input image is ${width}×${height} pixels. Your output MUST be exactly ${width}×${height} pixels. Same crop. Same composition. Do not change framing.\n\n`
        : "";

    // STYLE INJECTION SECTION: merge chosen style spec + product selections (master prompt structure)
    const styleInjectionApply = [
      resolvedStyleSpec ? resolvedStyleSpec.trim() : null,
      styleLines.length > 0 ? "Product/surface updates to apply:\n" + styleLines.join("\n") : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    const styleInjectionBlock =
      styleInjectionApply.length > 0
        ? `STYLE INJECTION SECTION — Apply the following. This defines the look only; layout stays identical.\n\nSelected Style${styleTitle ? `: ${styleTitle}` : ""}\n\nApply:\n${styleInjectionApply}\n\nBut DO NOT change: Cabinet placement. Appliance placement. Island position. Window location. Camera framing. Maintain identical perspective to source image.\n\n`
        : "Apply only material and finish updates. Do not change layout, camera, or composition.\n\n";

    const promptText = `MASTER IMAGE-TO-IMAGE STYLE UPDATE. The reference image (first image) is the ground truth layout. You are performing controlled interior style transformation — NOT a redesign.

${dimensionLock}CRITICAL RULES — The input image is the ground truth layout.

You MUST preserve:
- Camera angle and perspective
- Room geometry and wall positions
- Window placement and door placement
- Appliance location
- Island size and shape
- Cabinet layout structure
- Plumbing location
- Lighting layout position
- Floor plan, object scale, and proportions
- The exact same image boundaries and crop (same scene in frame)

You are NOT allowed to:
- Move walls or add or remove windows
- Change camera angle, lens distortion, or room layout
- Change object placement, perspective, or composition
- Zoom in, crop to a different area, or show a different part of the room

You are ONLY allowed to:
- Update materials and surface finishes
- Update fixture styles (faucets, sinks, lighting, hardware)
- Update color palette, textures, and aesthetic styling

Output must look like: Professional MLS real estate photography. Photorealistic. Natural daylight balanced exposure. No cinematic grading. No AI glow. No dramatic contrast. No over-stylization.
${hasRefImages ? refImageNote : ""}

${styleInjectionBlock}

CAMERA + REALISM BLOCK:
- Keep identical camera position as source image. Simulate full frame DSLR. 24mm tilt shift lens. Tripod mounted.
- Straight vertical lines. Corrected distortion. Even exposure. Balanced daylight.
- High resolution 8k interior real estate photo. Sharp details. No surreal artifacts. No hallucinated objects.

NEGATIVE PROMPT:
- No layout change. No camera shift. No new or missing windows. No furniture rearrangement. No scale distortion. No perspective warping. No added rooms. No structural redesign. No fantasy lighting. No stylized filters. No text or watermarks.

Output a single edited room image: same dimensions, same scene, same crop. Only materials and styles updated.`;

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
      console.error("[concept-render] Gemini API failed:", res.status, err);
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
      // Return any text response for debugging
      const textPart = responseParts.find((p) => p.text);
      return NextResponse.json(
        { error: textPart?.text || "No image returned from Gemini" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[concept-render] Error:", message, e instanceof Error ? e.stack : "");
    return NextResponse.json(
      { error: `Concept render failed: ${message}` },
      { status: 500 }
    );
  }
}
