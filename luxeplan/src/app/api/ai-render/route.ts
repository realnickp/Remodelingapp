import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
import { getProductById } from "@/lib/products";
import {
  createMaskPng,
  isSurfaceCategory,
  SELECTION_ORDER,
} from "@/lib/mask";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_RENDER_PROVIDER = (process.env.AI_RENDER_PROVIDER || "openai") as "openai" | "gemini";

const EDIT_SIZE = 1024;
const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";

function stripDataUrlPrefix(base64: string): string {
  if (base64.startsWith("data:")) {
    const i = base64.indexOf(",");
    return i >= 0 ? base64.slice(i + 1) : base64;
  }
  return base64;
}

/**
 * Resize the room image to the size required by the edit API (1024x1024).
 * Uses "cover" so the image fills the square and proportional mask regions stay correct.
 */
async function resizeToEditSize(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(EDIT_SIZE, EDIT_SIZE, { fit: "cover" })
    .png()
    .toBuffer();
}

/**
 * Build an enriched prompt from product metadata for better edit accuracy.
 */
function buildEnrichedPrompt(productName: string, productId?: string): string {
  const product = productId ? getProductById(productId) : undefined;
  const parts = [`Replace this area with ${productName}.`];
  if (product) {
    if (product.brand) parts.push(`Brand: ${product.brand}.`);
    if (product.material) parts.push(`Material: ${product.material}.`);
    if (product.finish) parts.push(`Finish: ${product.finish}.`);
    if (product.style_tags?.length) parts.push(`Style: ${product.style_tags.join(", ")}.`);
  }
  parts.push("Photorealistic, same lighting and style as the rest of the image. No text or watermarks.");
  return parts.join(" ");
}

/**
 * Call OpenAI image edit (GPT Image) with image + mask + prompt.
 * Uses gpt-image-1.5 and input_fidelity high to preserve unmasked areas.
 */
async function openAiImageEdit(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  prompt: string
): Promise<Buffer> {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }), "image.png");
  form.append("mask", new Blob([new Uint8Array(maskBuffer)], { type: "image/png" }), "mask.png");
  form.append("model", "dall-e-2");
  form.append("prompt", prompt);
  form.append("size", `${EDIT_SIZE}x${EDIT_SIZE}`);
  form.append("response_format", "b64_json");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI image edit failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image data in OpenAI edit response");
  }
  return Buffer.from(b64, "base64");
}

/**
 * Call Gemini API: room image + product reference image + prompt; returns edited room image.
 * Uses multi-image input so the model can match the product appearance.
 */
async function geminiImageEdit(
  roomImageBase64: string,
  productImageBase64: string,
  category: string,
  productName: string
): Promise<Buffer> {
  const categoryLabel = category.replace(/_/g, " ");
  const prompt = `The first image is a room photo. The second image shows the ${categoryLabel} product (${productName}) the user chose. Replace only the ${categoryLabel} region in the first image (the room) with the material, color, and style from the second image. Keep the rest of the room exactly the same. Photorealistic, same lighting and perspective. Output only the edited full room image.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/png", data: roomImageBase64 } },
              { inlineData: { mimeType: "image/png", data: productImageBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          responseMimeType: "image/png",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image edit failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in Gemini response");
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

export async function POST(request: NextRequest) {
  const provider = AI_RENDER_PROVIDER;
  if (provider === "gemini") {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }
  } else {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }
  }

  let body: {
    roomImageBase64?: string;
    selections?: {
      productId?: string;
      productName: string;
      category: string;
      productImageBase64?: string;
    }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { roomImageBase64, selections = [] } = body;
  if (!roomImageBase64 || typeof roomImageBase64 !== "string") {
    return NextResponse.json(
      { error: "roomImageBase64 is required" },
      { status: 400 }
    );
  }

  const base64 = stripDataUrlPrefix(roomImageBase64);

  try {
    const ordered = [...selections]
      .filter((s) => isSurfaceCategory(s.category))
      .sort(
        (a, b) =>
          SELECTION_ORDER.indexOf(a.category) - SELECTION_ORDER.indexOf(b.category)
      );

    if (provider === "gemini") {
      // Path A: Gemini with room + product reference images; chain one edit per selection.
      let currentRoomBase64 = base64;
      for (const { productName, category, productImageBase64 } of ordered) {
        if (!productImageBase64) continue;
        const productB64 = stripDataUrlPrefix(productImageBase64);
        const editedBuffer = await geminiImageEdit(
          currentRoomBase64,
          productB64,
          category,
          productName
        );
        currentRoomBase64 = editedBuffer.toString("base64");
      }
      const imageBuffer = Buffer.from(currentRoomBase64, "base64");
      const resized = await resizeToEditSize(imageBuffer);
      return NextResponse.json({ imageBase64: resized.toString("base64") });
    }

    // Path B: OpenAI GPT Image with mask + enriched prompt.
    const imageBuffer = Buffer.from(base64, "base64");
    let currentImage = await resizeToEditSize(imageBuffer);

    for (const { productId, productName, category } of ordered) {
      const maskBuffer = await createMaskPng(EDIT_SIZE, EDIT_SIZE, category);
      const prompt = buildEnrichedPrompt(productName, productId);
      currentImage = await openAiImageEdit(currentImage, maskBuffer, prompt);
    }

    const imageBase64 = currentImage.toString("base64");
    return NextResponse.json({ imageBase64 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `AI render failed: ${message}` },
      { status: 500 }
    );
  }
}
