/**
 * In-memory cache for object detection results.
 * Keyed by image URL so we only run detection once per image.
 */

import type { DetectedObject } from "@/types";

const cache = new Map<string, DetectedObject[]>();

export function getCachedDetection(imageUrl: string): DetectedObject[] | null {
  return cache.get(imageUrl) ?? null;
}

export function setCachedDetection(
  imageUrl: string,
  objects: DetectedObject[]
): void {
  cache.set(imageUrl, objects);
}
