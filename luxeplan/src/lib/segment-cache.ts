/**
 * In-memory cache for surface segmentation (polygons per category).
 * Keyed by image URL so we only run segmentation once per image.
 */

import type { SurfaceSegments } from "@/types";

const cache = new Map<string, SurfaceSegments>();

export function getCachedSegments(imageUrl: string): SurfaceSegments | null {
  return cache.get(imageUrl) ?? null;
}

export function setCachedSegments(
  imageUrl: string,
  segments: SurfaceSegments
): void {
  cache.set(imageUrl, segments);
}
