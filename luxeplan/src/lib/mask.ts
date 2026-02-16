import sharp from "sharp";

/**
 * Proportional regions matching StudioCanvas getSurfaceRegion (same % of height/width).
 * Used to build server-side masks for inpainting so only the selected area is edited.
 */
function getRegionForCategory(
  category: string,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } | null {
  switch (category) {
    case "flooring":
      return { x: 0, y: height * 0.6, w: width, h: height * 0.4 };
    case "countertops":
      return { x: 0, y: height * 0.38, w: width, h: height * 0.14 };
    case "backsplash":
      return { x: 0, y: height * 0.18, w: width, h: height * 0.2 };
    case "cabinets":
      return { x: 0, y: height * 0.52, w: width, h: height * 0.14 };
    default:
      return null;
  }
}

/**
 * Surface categories that have a proportional band; object categories (faucet, sink, etc.) are not supported for inpainting in v1.
 */
export const INPAINT_SURFACE_CATEGORIES = [
  "flooring",
  "backsplash",
  "countertops",
  "cabinets",
] as const;

/**
 * Order to process selections so edits chain correctly (e.g. flooring first, then backsplash, countertops, cabinets).
 */
export const SELECTION_ORDER: string[] = [
  "flooring",
  "backsplash",
  "countertops",
  "cabinets",
];

/**
 * Build a PNG mask for the image edit API. Same dimensions as the image.
 * Transparent pixels = area to replace (edit); opaque = keep.
 * Uses the same proportional regions as the front-end getSurfaceRegion.
 */
export async function createMaskPng(
  width: number,
  height: number,
  category: string
): Promise<Buffer> {
  const region = getRegionForCategory(category, width, height);
  if (!region) {
    throw new Error(`No mask region for category: ${category}`);
  }

  const x = Math.floor(region.x);
  const y = Math.floor(region.y);
  const w = Math.min(Math.ceil(region.w), width - x);
  const h = Math.min(Math.ceil(region.h), height - y);

  // RGBA: we want transparent (alpha=0) where we edit, opaque (alpha=255) elsewhere.
  const size = width * height * 4;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i += 4) {
    buf[i] = 255;
    buf[i + 1] = 255;
    buf[i + 2] = 255;
    buf[i + 3] = 255;
  }
  for (let py = y; py < y + h && py < height; py++) {
    for (let px = x; px < x + w && px < width; px++) {
      const i = (py * width + px) * 4;
      buf[i + 3] = 0; // transparent = replace
    }
  }

  const png = await sharp(buf, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return png;
}

/**
 * Whether this category is supported for inpainting (has a proportional region).
 */
export function isSurfaceCategory(category: string): boolean {
  return getRegionForCategory(category, 1, 1) !== null;
}
