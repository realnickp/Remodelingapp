import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

/**
 * POST /api/segment-surfaces
 *
 * Asks Gemini for per-surface polygons (normalized 0-1) for floor, walls,
 * countertops, backsplash, cabinets. Used for pixel-accurate texture overlay.
 */
export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
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
        text: `You are analyzing a ${roomType} photo for a room visualizer. For each SURFACE type below, return ONE polygon that outlines the visible extent of that surface. Coordinates must be normalized 0-1 (0,0 = top-left, 1,1 = bottom-right). Each polygon is an array of [x,y] points in order (e.g. clockwise). Use enough points to follow the surface shape (at least 4, up to ~30).

Return ONLY a JSON object (no markdown) with exactly these keys. If a surface is not visible, use an empty array for that key.
- "flooring": polygon for the visible floor
- "walls": polygon for the main visible wall(s) — you may combine into one polygon or use the largest wall
- "countertops": polygon for countertop surface(s)
- "backsplash": polygon for backsplash area (if visible)
- "cabinets": polygon for cabinet front surfaces (if visible)

Example shape: { "flooring": [[0.1,0.7],[0.9,0.7],[0.9,1],[0.1,1]], "walls": [...], "countertops": [...], "backsplash": [], "cabinets": [...] }

Return the JSON object only.`,
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
      return NextResponse.json(
        { error: `Gemini API failed: ${res.status} ${err}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) {
      return NextResponse.json(
        { error: "No response from Gemini" },
        { status: 502 }
      );
    }

    let jsonStr = textPart.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const raw = JSON.parse(jsonStr) as Record<string, unknown>;
    const segments: Record<string, [number, number][]> = {};
    const keys = ["flooring", "walls", "countertops", "backsplash", "cabinets"];
    for (const key of keys) {
      const val = raw[key];
      if (Array.isArray(val) && val.length > 0) {
        const polygon = val.filter(
          (p): p is [number, number] =>
            Array.isArray(p) &&
            p.length >= 2 &&
            typeof p[0] === "number" &&
            typeof p[1] === "number"
        ).map(([x, y]) => [
          Math.max(0, Math.min(1, Number(x))),
          Math.max(0, Math.min(1, Number(y))),
        ]) as [number, number][];
        if (polygon.length >= 3) segments[key] = polygon;
      }
    }

    return NextResponse.json({ segments });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Segmentation failed: ${message}` },
      { status: 500 }
    );
  }
}
