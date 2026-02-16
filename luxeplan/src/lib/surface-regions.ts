import type { DetectedObject, ProductCategory } from "@/types";

/** Fallback: map API label to ProductCategory when category is missing or invalid. */
function labelToCategory(label: string, roomType: "kitchen" | "bathroom"): ProductCategory {
  const L = label.toLowerCase();
  const kitchen: [string[], ProductCategory][] = [
    [["counter", "countertop", "counter top"], "countertops"],
    [["cabinet", "drawer", "cupboard"], "cabinets"],
    [["backsplash", "tile", "wall tile"], "backsplash"],
    [["faucet", "tap"], "faucets"],
    [["sink"], "sinks"],
    [["island"], "islands"],
    [["wall"], "walls"],
    [["floor", "flooring"], "flooring"],
    [["light", "pendant", "fixture"], "lighting"],
    [["handle", "knob", "hardware"], "hardware"],
    [["appliance", "fridge", "refrigerator", "oven", "range", "dishwasher", "microwave", "hood"], "appliances"],
    [["storage", "pantry"], "storage"],
    [["window"], "windows"],
    [["door"], "doors"],
  ];
  const bathroom: [string[], ProductCategory][] = [
    [["vanity"], "vanity"],
    [["counter", "countertop"], "countertops"],
    [["faucet", "tap"], "faucets"],
    [["sink", "basin"], "sinks"],
    [["mirror"], "mirrors"],
    [["light", "sconce"], "lighting"],
    [["shower", "showerhead"], "shower"],
    [["tub", "bathtub", "bath"], "tub"],
    [["toilet", "wc"], "toilet"],
    [["wall"], "walls"],
    [["floor", "tile"], "flooring"],
    [["backsplash", "tile"], "backsplash"],
    [["handle", "hardware"], "hardware"],
    [["storage"], "storage"],
    [["window"], "windows"],
    [["door"], "doors"],
  ];
  const list = roomType === "kitchen" ? kitchen : bathroom;
  for (const [keywords, cat] of list) {
    if (keywords.some((k) => L.includes(k))) return cat;
  }
  return roomType === "kitchen" ? "countertops" : "vanity";
}

export interface CategoryBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Heuristic bbox when detection hasn't run or didn't return this category (normalized 0-1). */
export function getFallbackBbox(
  category: ProductCategory,
  _roomType: "kitchen" | "bathroom"
): CategoryBbox {
  switch (category) {
    case "flooring":
      return { x: 0, y: 0.6, width: 1, height: 0.4 };
    case "walls":
      return { x: 0, y: 0, width: 1, height: 0.7 };
    case "countertops":
      return { x: 0.1, y: 0.35, width: 0.8, height: 0.25 };
    case "backsplash":
      return { x: 0.15, y: 0.2, width: 0.7, height: 0.3 };
    case "cabinets":
      return { x: 0.05, y: 0.25, width: 0.9, height: 0.4 };
    case "islands":
      return { x: 0.25, y: 0.4, width: 0.5, height: 0.2 };
    case "vanity":
      return { x: 0.2, y: 0.35, width: 0.6, height: 0.35 };
    default:
      return { x: 0.2, y: 0.3, width: 0.6, height: 0.4 };
  }
}

/**
 * Returns one representative bbox per category (largest detected object in that category).
 * Uses getFallbackBbox when no detection for that category. Used for instant texture overlay.
 */
export function getCategoryBboxes(
  objects: DetectedObject[],
  roomType: "kitchen" | "bathroom"
): Record<ProductCategory, CategoryBbox> {
  const byCat = new Map<ProductCategory, DetectedObject>();
  for (const obj of objects) {
    const cat = (obj.category as ProductCategory) || labelToCategory(obj.label, roomType);
    const existing = byCat.get(cat);
    const area = obj.width * obj.height;
    if (!existing || area > existing.width * existing.height) {
      byCat.set(cat, obj);
    }
  }
  const result: Record<string, CategoryBbox> = {};
  byCat.forEach((obj, category) => {
    result[category] = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
  });
  return result as Record<ProductCategory, CategoryBbox>;
}

/** Get bbox for a single category: from detection or fallback. */
export function getBboxForCategory(
  category: ProductCategory,
  objects: DetectedObject[],
  roomType: "kitchen" | "bathroom"
): CategoryBbox {
  const bboxes = getCategoryBboxes(objects, roomType);
  return bboxes[category] ?? getFallbackBbox(category, roomType);
}
