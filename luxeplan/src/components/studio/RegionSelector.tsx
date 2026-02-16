"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import type { DetectedObject, ProductCategory } from "@/types";
import { getCachedDetection, setCachedDetection } from "@/lib/detection-cache";
import { getCachedSegments, setCachedSegments } from "@/lib/segment-cache";

// ── Helpers ──

/**
 * Load an image URL (or data URL) and return a downsized JPEG base64 string.
 * Keeps the image ≤ maxDim on its longest side to minimise payload to Gemini.
 */
async function imageToCompressedBase64(url: string, maxDim = 1024): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  // JPEG at 0.7 quality → much smaller payload than full-res PNG
  return canvas.toDataURL("image/jpeg", 0.7);
}

/** Find the smallest detected object whose bounding box contains the point. */
function findObjectAtPoint(
  x: number,
  y: number,
  objects: DetectedObject[]
): DetectedObject | null {
  const hits = objects.filter(
    (obj) =>
      x >= obj.x &&
      x <= obj.x + obj.width &&
      y >= obj.y &&
      y <= obj.y + obj.height
  );
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.width * a.height - b.width * b.height);
  return hits[0];
}

/** Find the nearest detected object to a point (by center-to-center distance). */
function findNearestObject(
  x: number,
  y: number,
  objects: DetectedObject[]
): DetectedObject | null {
  if (objects.length === 0) return null;
  let best = objects[0];
  let bestDist = Infinity;
  for (const obj of objects) {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const dist = (cx - x) ** 2 + (cy - y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = obj;
    }
  }
  return best;
}

/** Category → display label for pill (Roomvo-style). */
const CATEGORY_PILL_LABELS: Record<ProductCategory, string> = {
  flooring: "Floors",
  walls: "Walls",
  countertops: "Countertops",
  backsplash: "Backsplash",
  cabinets: "Cabinetry",
  faucets: "Faucets",
  sinks: "Sinks",
  islands: "Islands",
  lighting: "Lighting",
  hardware: "Hardware",
  appliances: "Appliances",
  storage: "Storage",
  windows: "Windows",
  doors: "Doors",
  vanity: "Vanity",
  mirrors: "Mirrors",
  shower: "Shower",
  tub: "Bathtubs",
  toilet: "Toilets",
  fixtures: "Fixtures",
};

/** Group detected objects by category and compute one pill per category (centroid + representative bbox). */
function groupByCategory(
  objects: DetectedObject[],
  roomType: "kitchen" | "bathroom"
): { category: ProductCategory; label: string; cx: number; cy: number; bbox: { x: number; y: number; width: number; height: number } }[] {
  const byCat = new Map<ProductCategory, DetectedObject[]>();
  for (const obj of objects) {
    const cat = (obj.category as ProductCategory) || labelToCategory(obj.label, roomType);
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(obj);
  }
  const result: { category: ProductCategory; label: string; cx: number; cy: number; bbox: { x: number; y: number; width: number; height: number } }[] = [];
  byCat.forEach((objs, category) => {
    const label = CATEGORY_PILL_LABELS[category] ?? category;
    // Centroid of all boxes
    let sumX = 0, sumY = 0, areaSum = 0;
    let bestBox = objs[0];
    let maxArea = 0;
    for (const o of objs) {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      const area = o.width * o.height;
      sumX += cx * area;
      sumY += cy * area;
      areaSum += area;
      if (area > maxArea) {
        maxArea = area;
        bestBox = o;
      }
    }
    const cx = areaSum > 0 ? sumX / areaSum : bestBox.x + bestBox.width / 2;
    const cy = areaSum > 0 ? sumY / areaSum : bestBox.y + bestBox.height / 2;
    result.push({
      category,
      label,
      cx,
      cy,
      bbox: { x: bestBox.x, y: bestBox.y, width: bestBox.width, height: bestBox.height },
    });
  });
  return result;
}

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

export default function RegionSelector() {
  const project = useProjectStore((s) => s.project);
  const selectedRegion = useProjectStore((s) => s.selectedRegion);
  const setSelectedRegion = useProjectStore((s) => s.setSelectedRegion);
  const setActiveCategory = useProjectStore((s) => s.setActiveCategory);
  const conceptImageUrl = useProjectStore((s) => s.conceptImageUrl);
  const studioMode = useProjectStore((s) => s.studioMode);
  const detectedObjects = useProjectStore((s) => s.detectedObjects);
  const setDetectedObjects = useProjectStore((s) => s.setDetectedObjects);
  const objectDetectionLoading = useProjectStore((s) => s.objectDetectionLoading);
  const setObjectDetectionLoading = useProjectStore((s) => s.setObjectDetectionLoading);
  const setSurfaceSegments = useProjectStore((s) => s.setSurfaceSegments);
  const setSegmentLoading = useProjectStore((s) => s.setSegmentLoading);
  const showBeforeAfter = useProjectStore((s) => s.showBeforeAfter);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(dragging);
  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);
  const [regionLabel, setRegionLabel] = useState<string | null>(null);
  const [hoveredObject, setHoveredObject] = useState<DetectedObject | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  const roomType = project?.room_type ?? "kitchen";
  const surfacePills = groupByCategory(detectedObjects, roomType);
  const activeCategory = useProjectStore((s) => s.activeCategory);

  // When sidebar category or detection result changes, sync selected region to that category's pill (if any)
  useEffect(() => {
    const match = surfacePills.find((p) => p.category === activeCategory);
    if (match) {
      setSelectedRegion(match.bbox);
      setRegionLabel(match.label);
    }
  }, [activeCategory, detectedObjects.length]); // surfacePills derived from detectedObjects

  // ── Run object detection ONCE on the original room image and persist results ──
  // Detection runs on the original photo only (not concept images) so results
  // stay stable across edits. Cached by original URL to avoid redundant calls.
  useEffect(() => {
    const sourceUrl = project?.original_image_url;
    if (!sourceUrl) return;

    // Capture as const for use inside async closure
    const url = sourceUrl;

    const cachedDetection = getCachedDetection(url);
    const cachedSegments = getCachedSegments(url);
    if (cachedDetection) setDetectedObjects(cachedDetection);
    if (cachedSegments) setSurfaceSegments(cachedSegments);
    if (cachedDetection && cachedSegments) return;

    let cancelled = false;

    async function run() {
      if (!cachedDetection) {
        setObjectDetectionLoading(true);
        setDetectedObjects([]);
      }
      try {
        const imageBase64 = await imageToCompressedBase64(url, 1024);
        if (cancelled) return;

        if (!cachedDetection) {
          const res = await fetch("/api/detect-objects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64, roomType }),
          });
          if (!res.ok) throw new Error(`Detection failed: ${res.status}`);
          const data = await res.json();
          if (!cancelled && Array.isArray(data.objects)) {
            const objects = data.objects as DetectedObject[];
            setCachedDetection(url, objects);
            setDetectedObjects(objects);
          }
        }

        if (!cachedSegments && !cancelled) {
          setSegmentLoading(true);
          try {
            const segRes = await fetch("/api/segment-surfaces", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64, roomType }),
            });
            if (segRes.ok) {
              const segData = await segRes.json();
              if (!cancelled && segData.segments) {
                setCachedSegments(url, segData.segments);
                setSurfaceSegments(segData.segments);
              }
            }
          } finally {
            if (!cancelled) setSegmentLoading(false);
          }
        }
      } catch (err) {
        console.error("Object detection error:", err);
      } finally {
        if (!cancelled && !cachedDetection) setObjectDetectionLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [
    project?.original_image_url,
    roomType,
    setDetectedObjects,
    setObjectDetectionLoading,
    setSurfaceSegments,
    setSegmentLoading,
  ]);

  const selectObject = useCallback(
    (obj: DetectedObject) => {
      const category =
        (obj.category as ProductCategory) ||
        labelToCategory(obj.label, roomType);
      setSelectedRegion({ x: obj.x, y: obj.y, width: obj.width, height: obj.height });
      setRegionLabel(obj.label);
      setActiveCategory(category);
    },
    [roomType, setSelectedRegion, setActiveCategory]
  );

  const getNormalizedFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      };
    },
    []
  );

  const getNormalized = useCallback(
    (e: React.MouseEvent) => getNormalizedFromClient(e.clientX, e.clientY),
    [getNormalizedFromClient]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const pos = getNormalized(e);
      setStart(pos);
      setCurrent(pos);
      setDragging(true);
    },
    [getNormalized]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getNormalized(e);
      if (dragging) {
        setCurrent(pos);
        return;
      }
      // Hover: track the object under the cursor and cursor position for text indicator
      const obj = findObjectAtPoint(pos.x, pos.y, detectedObjects);
      setHoveredObject(obj ?? null);
      setHoverPosition(obj ? pos : null);
    },
    [dragging, getNormalized, detectedObjects]
  );

  const commitSelection = useCallback(
    (startPos: { x: number; y: number }, currentPos: { x: number; y: number }) => {
      const dx = Math.abs(currentPos.x - startPos.x);
      const dy = Math.abs(currentPos.y - startPos.y);

      if (dx < 0.02 && dy < 0.02) {
        const obj = findObjectAtPoint(startPos.x, startPos.y, detectedObjects);
        if (obj) {
          selectObject(obj);
        } else {
          setSelectedRegion(null);
          setRegionLabel(null);
        }
      } else {
        const region = {
          x: Math.min(startPos.x, currentPos.x),
          y: Math.min(startPos.y, currentPos.y),
          width: dx,
          height: dy,
        };
        setSelectedRegion(region);
        const cx = region.x + region.width / 2;
        const cy = region.y + region.height / 2;
        const nearest = findNearestObject(cx, cy, detectedObjects);
        setRegionLabel(nearest?.label ?? "Custom Region");
        if (nearest) {
          const category = (nearest.category as ProductCategory) || labelToCategory(nearest.label, roomType);
          setActiveCategory(category);
        }
      }
    },
    [detectedObjects, roomType, selectObject, setSelectedRegion, setActiveCategory]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging || !start || !current) {
      setDragging(false);
      return;
    }
    commitSelection(start, current);
    setDragging(false);
    setStart(null);
    setCurrent(null);
  }, [dragging, start, current, commitSelection]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      const pos = getNormalizedFromClient(t.clientX, t.clientY);
      setStart(pos);
      setCurrent(pos);
      setDragging(true);
    },
    [getNormalizedFromClient]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 0 || !dragging) return;
      const t = e.touches[0];
      const pos = getNormalizedFromClient(t.clientX, t.clientY);
      setCurrent(pos);
    },
    [dragging, getNormalizedFromClient]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current && e.touches.length > 0) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      if (!dragging || !start || !current) {
        setDragging(false);
        setStart(null);
        setCurrent(null);
        return;
      }
      commitSelection(start, current);
      setDragging(false);
      setStart(null);
      setCurrent(null);
    },
    [dragging, start, current, commitSelection]
  );

  // Drag-in-progress rect
  const dragRect =
    dragging && start && current
      ? {
          left: `${Math.min(start.x, current.x) * 100}%`,
          top: `${Math.min(start.y, current.y) * 100}%`,
          width: `${Math.abs(current.x - start.x) * 100}%`,
          height: `${Math.abs(current.y - start.y) * 100}%`,
        }
      : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 cursor-crosshair"
      style={showBeforeAfter ? { pointerEvents: "none" } : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setHoveredObject(null);
        setHoverPosition(null);
        handleMouseUp();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hover: small text indicator at cursor only (no highlight overlays) */}
      {hoveredObject && hoverPosition && !showBeforeAfter && detectedObjects.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute z-10 px-2 py-1 rounded bg-lx-charcoal text-lx-ivory text-[0.6875rem] font-sans font-medium whitespace-nowrap shadow-lg"
            style={{
              left: `${Math.min(hoverPosition.x * 100 + 4, 100 - 20)}%`,
              top: `${Math.max(0, hoverPosition.y * 100 - 10)}%`,
            }}
          >
            {hoveredObject.label}
          </div>
        </div>
      )}

      {/* Scanning indicator */}
      <AnimatePresence>
        {objectDetectionLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <span className="flex items-center gap-2 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Identifying surfaces…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag-in-progress feedback */}
      {dragRect && (
        <div
          className="absolute border-2 border-dashed border-lx-accent bg-lx-accent/10 pointer-events-none"
          style={dragRect}
        />
      )}
    </div>
  );
}
