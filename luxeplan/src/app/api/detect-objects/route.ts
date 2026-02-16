import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

const KITCHEN_CATEGORIES =
  "countertops, cabinets, backsplash, faucets, sinks, islands, walls, flooring, lighting, hardware, appliances, storage, windows, doors";
const BATHROOM_CATEGORIES =
  "vanity, countertops, faucets, sinks, mirrors, lighting, shower, tub, toilet, walls, flooring, backsplash, hardware, storage, windows, doors";

interface DetectedObject {
  label: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * POST /api/detect-objects
 *
 * Sends an image to Gemini and returns every identifiable object/surface/feature
 * with normalized 0-1 bounding boxes.
 */
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Set it in .env.local." },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string; roomType?: "kitchen" | "bathroom" };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, roomType = "kitchen" } = body;
  if (!imageBase64) {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 }
    );
  }

  const categories =
    roomType === "kitchen" ? KITCHEN_CATEGORIES : BATHROOM_CATEGORIES;

  let rawBase64 = imageBase64;
  if (rawBase64.startsWith("data:")) {
    const idx = rawBase64.indexOf(",");
    rawBase64 = idx >= 0 ? rawBase64.slice(idx + 1) : rawBase64;
  }

  try {
    const parts = [
      {
        inlineData: { mimeType: "image/png", data: rawBase64 },
      },
      {
        text: `You are a precise interior design surface and object detection system. Analyze this ${roomType} photograph and return the EXACT location of every surface and fixture. Targeted edits depend on this — backsplash, walls, floor, and cabinets MUST be detected when visible.

REQUIRED SURFACES (you MUST return a box for each when visible in the image):
1. Floor — The horizontal floor surface (wood, tile, etc.) visible at the bottom of the room. One box covering the full visible floor area. Category: "flooring".
2. Backsplash — The vertical strip of tile or wall material BETWEEN the countertop and the upper cabinets, directly behind the sink or cooktop. It is NOT the counter, NOT the upper cabinet, NOT the wall above. It is the tiled/finished strip only. Category: "backsplash".
3. Walls — Each visible wall plane (painted or finished vertical surface). Include the wall behind the backsplash (above uppers), side walls, and any other visible wall. One box per distinct wall plane. Category: "walls".
4. Cabinets — Lower cabinet faces (below the counter) and upper cabinet faces (above the counter/backsplash). One box per cabinet run or bank (e.g. "Lower cabinets left", "Upper cabinets", "Island cabinets"). Category: "cabinets".
5. Countertop — The horizontal work surface(s) on top of base cabinets. Each continuous run gets one box. Category: "countertops".

Then add fixtures and objects (one box each): Sink, Faucet, Island, Lighting (per pendant/sconce), Appliance (per appliance), Window, Door. Use the same label names and categories from the list below.

DEFINITIONS:
- Backsplash: only the strip between counter and upper cabinets (tile or solid surface there). Often rectangular, horizontal band.
- Floor: entire visible floor in frame.
- Wall: any visible vertical wall surface (can be multiple boxes for different walls).
- Cabinet: front faces of lower and upper cabinetry; do not include counter or backsplash in the cabinet box.

Return ONLY a JSON array. Each element: "label" (e.g. "Floor", "Backsplash", "Wall", "Cabinet", "Countertop", "Sink", "Faucet"), "category" (exactly one of: ${categories}), "x", "y", "width", "height" (0-1 normalized). Bounding boxes must tightly enclose that element only.

Checklist before returning: when visible, your array MUST include at least one box for Floor (flooring), at least one for Backsplash (backsplash) if there is a strip between counter and uppers, at least one for Wall (walls), at least one for Cabinet (cabinets), and at least one for Countertop (countertops). Then add all other visible fixtures. Return the JSON array only, no markdown or code blocks.`,
      },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[detect-objects] Gemini API failed:", res.status, err);
      return NextResponse.json(
        { error: `Gemini API failed: ${res.status} ${err}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) {
      return NextResponse.json(
        { error: "No response from Gemini" },
        { status: 502 }
      );
    }

    // Parse the JSON response — strip markdown code fences if present
    let jsonStr = textPart.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const raw: unknown[] = JSON.parse(jsonStr);
    const validCategories = new Set(
      (roomType === "kitchen" ? KITCHEN_CATEGORIES : BATHROOM_CATEGORIES).split(
        ", "
      )
    );

    // Validate and clamp values
    const objects: DetectedObject[] = raw
      .filter(
        (obj): obj is Record<string, unknown> =>
          typeof obj === "object" &&
          obj !== null &&
          typeof (obj as Record<string, unknown>).label === "string"
      )
      .map((obj) => {
        const cat = String(obj.category || "").toLowerCase().replace(/\s/g, "");
        const category = validCategories.has(cat)
          ? cat
          : validCategories.has("countertops")
          ? "countertops"
          : "vanity";
        return {
          label: String(obj.label),
          category,
          x: clamp(Number(obj.x) || 0),
          y: clamp(Number(obj.y) || 0),
          width: clamp(Number(obj.width) || 0),
          height: clamp(Number(obj.height) || 0),
        };
      })
      .filter((obj) => obj.width > 0 && obj.height > 0);

    return NextResponse.json({ objects });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[detect-objects] Error:", message, e instanceof Error ? e.stack : "");
    return NextResponse.json(
      { error: `Object detection failed: ${message}` },
      { status: 500 }
    );
  }
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
