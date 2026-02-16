/**
 * In-memory cache for concept-render results.
 * Key = room image URL + sorted selection IDs. When the user applies the same
 * set of products again, we return the cached image for instant display.
 */

const cache = new Map<string, string>();

export function getConceptCacheKey(
  roomImageUrl: string,
  selectionProductIds: string[]
): string {
  const sorted = [...selectionProductIds].sort();
  return `${roomImageUrl}|${sorted.join(",")}`;
}

export function getCachedConcept(key: string): string | null {
  return cache.get(key) ?? null;
}

export function setCachedConcept(key: string, imageDataUrl: string): void {
  cache.set(key, imageDataUrl);
  // Limit cache size to avoid memory bloat (e.g. last 30 renders)
  if (cache.size > 30) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}
