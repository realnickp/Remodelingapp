import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getStyleById } from "@/lib/style-specs";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp-image-generation";
const MAX_EDGE = 1024;

const SYSTEM_INSTRUCTION = `You are a professional Architectural Visualizer. Your sole objective is to perform a photorealistic surface-level remodel of the provided image.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. GEOMETRIC LOCK: You must not move, rotate, scale, or shift any structural elements. Walls, windows, doorways, and ceiling heights must remain in their exact pixel-coordinates.
2. PLUMBING & APPLIANCE ANCHOR: The location of sinks, faucets, stoves, fridges, tubs, and toilets must be identical to the original image.
3. PERSPECTIVE INTEGRITY: Retain the exact camera focal length and vanishing points.
4. LIGHTING FIDELITY: Maintain the original natural light sources (e.g., if sun comes from a window on the left, new surfaces must show correct highlights on the left and shadows on the right).

TECHNICAL EXECUTION:
- Apply new textures and materials ONLY to the surfaces (cabinets, counters, floors, walls).
- Ensure sharp, high-contrast edges where different materials meet.
- Output a high-resolution, photorealistic image that looks like a real estate 'After' photo.
- DO NOT add any new furniture, decor, or clutter that is not in the original photo.`;

interface StyleRenderItem {
  category: string;
  name: string;
  material?: string;
  finish?: string;
  estimatedCost?: number;
}

function buildUserPrompt(styleName: string, styleSpec: string): string {
  return `### STYLE TARGET: ${styleName}

### FEATURE UPDATES:
${styleSpec}

### FINAL DIRECTIVE:
Maintain 100% layout fidelity. Do not change the frame or camera angle.`;
}

/**
 * POST /api/style-render
 *
 * Uses Gemini with hybrid config: system instruction (architectural constraints)
 * + user prompt (style injection). Preserves layout; only surfaces are restyled.
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
    styleId?: string;
    styleDescription?: string;
    styleSpec?: string;
    styleMoodboardBase64?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomImageBase64, styleId, styleDescription, styleSpec: styleSpecRaw } = body;

  if (!roomImageBase64) {
    return NextResponse.json(
      { error: "roomImageBase64 is required" },
      { status: 400 }
    );
  }

  const stripDataUrl = (s: string) => {
    if (s.startsWith("data:")) {
      const idx = s.indexOf(",");
      return idx >= 0 ? s.slice(idx + 1) : s;
    }
    return s;
  };

  let rawBase64 = stripDataUrl(roomImageBase64);
  if (!rawBase64 || rawBase64.length < 100) {
    return NextResponse.json(
      { error: "roomImageBase64 is too short or missing; provide a valid image." },
      { status: 400 }
    );
  }

  const mime = "image/png";
  try {
    const buf = Buffer.from(rawBase64, "base64");
    if (buf.length === 0) {
      return NextResponse.json(
        { error: "Invalid image: base64 decoding failed." },
        { status: 400 }
      );
    }
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    let out = sharp(buf);
    if (w > 0 && h > 0 && (w > MAX_EDGE || h > MAX_EDGE)) {
      const scale = MAX_EDGE / Math.max(w, h);
      out = out.resize(Math.round(w * scale), Math.round(h * scale), { fit: "inside" });
    }
    rawBase64 = (await out.png().toBuffer()).toString("base64");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[style-render] Image process failed:", msg);
    return NextResponse.json(
      { error: `Image processing failed: ${msg}` },
      { status: 400 }
    );
  }

  const styleName = styleId
    ? (getStyleById(styleId as Parameters<typeof getStyleById>[0])?.title ?? styleId.replace(/-/g, " "))
    : "Modern";
  const styleSpecText = styleSpecRaw?.trim() ?? `Style: ${styleName}. ${styleDescription || "Apply this aesthetic to all visible surfaces."}`;
  const userPromptText = buildUserPrompt(styleName, styleSpecText);

  const fullUserPrompt = `${SYSTEM_INSTRUCTION}

---

Apply the following remodel while keeping the layout identical. Use the image below as the only input.

${userPromptText}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: fullUserPrompt },
                { inlineData: { mimeType: mime, data: rawBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 1,
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    const errText = await res.text();
    if (!res.ok) {
      console.error("[style-render] Gemini API failed:", res.status, errText);
      let errBody: unknown;
      try {
        errBody = JSON.parse(errText);
      } catch {
        errBody = { error: { message: errText } };
      }
      const message =
        typeof (errBody as { error?: { message?: string } })?.error?.message === "string"
          ? (errBody as { error: { message: string } }).error.message
          : errText;
      const status = res.status >= 400 && res.status < 600 ? res.status : 502;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }

    let data: {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
        };
      }>;
    };
    try {
      data = JSON.parse(errText);
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Gemini" },
        { status: 502 }
      );
    }

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const textPart = parts.find((p) => p.text);
      console.error("[style-render] No image in response:", textPart?.text ?? "no parts");
      return NextResponse.json(
        { error: textPart?.text ?? "No image returned from Gemini" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      usedItems: [] as StyleRenderItem[],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[style-render] Error:", message, e instanceof Error ? e.stack : "");
    return NextResponse.json(
      { error: `Style render failed: ${message}` },
      { status: 500 }
    );
  }
}
