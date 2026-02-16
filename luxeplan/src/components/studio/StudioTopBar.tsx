"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import {
  getConceptCacheKey,
  getCachedConcept,
  setCachedConcept,
} from "@/lib/concept-cache";
import { getBboxForCategory } from "@/lib/surface-regions";
import { STYLES, getStyleById } from "@/lib/style-specs";
import type { ProductCategory, DesignStyle } from "@/types";

const SELECTION_ORDER: string[] = [
  "flooring",
  "backsplash",
  "countertops",
  "cabinets",
];
import LuxeLogo from "@/components/LuxeLogo";

async function imageUrlToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) {
    const i = imageUrl.indexOf(",");
    return i >= 0 ? imageUrl.slice(i + 1) : imageUrl;
  }
  const url = imageUrl.startsWith("/")
    ? window.location.origin + imageUrl
    : imageUrl;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getRoomImageBase64(originalImageUrl: string): Promise<string> {
  return imageUrlToBase64(originalImageUrl);
}

/** Returns full data URL for the current base image (concept or original). */
async function getCurrentBaseDataUrl(
  conceptImageUrl: string | null,
  originalImageUrl: string
): Promise<string> {
  const url = conceptImageUrl || originalImageUrl;
  if (url.startsWith("data:")) return url;
  const b64 = await getRoomImageBase64(url);
  return `data:image/png;base64,${b64}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  faucets: "Faucet", sinks: "Sink", countertops: "Countertop", cabinets: "Cabinet",
  backsplash: "Backsplash", flooring: "Floor", lighting: "Lighting", mirrors: "Mirror",
  hardware: "Hardware", appliances: "Appliance", shower: "Shower", tub: "Bathtub",
  vanity: "Vanity", toilet: "Toilet", walls: "Wall", islands: "Island", storage: "Storage",
  windows: "Window", doors: "Door", fixtures: "Fixture",
};

export default function StudioTopBar() {
  const project = useProjectStore((s) => s.project);
  const budget = useProjectStore((s) => s.budget);
  const selections = useProjectStore((s) => s.selections);
  const studioMode = useProjectStore((s) => s.studioMode);
  const setStudioMode = useProjectStore((s) => s.setStudioMode);
  const conceptImageUrl = useProjectStore((s) => s.conceptImageUrl);
  const pushConceptImage = useProjectStore((s) => s.pushConceptImage);
  const undoConcept = useProjectStore((s) => s.undoConcept);
  const redoConcept = useProjectStore((s) => s.redoConcept);
  const canUndo = useProjectStore((s) => s.canUndo());
  const canRedo = useProjectStore((s) => s.canRedo());
  const conceptLoading = useProjectStore((s) => s.conceptLoading);
  const setConceptLoading = useProjectStore((s) => s.setConceptLoading);
  const showBeforeAfter = useProjectStore((s) => s.showBeforeAfter);
  const toggleBeforeAfter = useProjectStore((s) => s.toggleBeforeAfter);
  const saveVersion = useProjectStore((s) => s.saveVersion);
  const versions = useProjectStore((s) => s.versions);
  const clearSelections = useProjectStore((s) => s.clearSelections);
  const setSelectedRegion = useProjectStore((s) => s.setSelectedRegion);
  const setProject = useProjectStore((s) => s.setProject);
  const setConceptImageUrl = useProjectStore((s) => s.setConceptImageUrl);
  const selectedStyle = useProjectStore((s) => s.selectedStyle);
  const setSelectedStyle = useProjectStore((s) => s.setSelectedStyle);
  const detectedObjects = useProjectStore((s) => s.detectedObjects);
  const [projectName, setProjectName] = useState(
    project?.name || "Untitled Project"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);

  const handleSeeInYourSpace = useCallback(async () => {
    if (!project?.original_image_url || selections.length === 0) return;
    setConceptError(null);

    const effectiveStyleId = selectedStyle || project?.design_style;
    const cacheKey = getConceptCacheKey(
      project.original_image_url,
      selections.map((s) => s.product.id).concat(effectiveStyleId ? [effectiveStyleId] : [])
    );
    const cached = getCachedConcept(cacheKey);
    if (cached) {
      pushConceptImage(cached);
      setStudioMode("concept");
      return;
    }

    setConceptLoading(true);
    try {
      const roomType = project.room_type || "kitchen";
      const objectInventory = detectedObjects.map((obj) => ({
        label: obj.label,
        category: obj.category,
        region: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
      }));

      const selectionsWithImages = await Promise.all(
        selections.map(async (s) => {
          let productImageBase64: string | undefined;
          try {
            productImageBase64 = await imageUrlToBase64(s.product.image_url);
          } catch {
            // omit if product image fails to load
          }
          return {
            selection: s,
            productImageBase64,
          };
        })
      );

      const orderIndex = (cat: string) => {
        const i = SELECTION_ORDER.indexOf(cat);
        return i >= 0 ? i : SELECTION_ORDER.length;
      };
      selectionsWithImages.sort(
        (a, b) =>
          orderIndex(a.selection.product.category) -
          orderIndex(b.selection.product.category)
      );

      let currentBase = await getCurrentBaseDataUrl(
        conceptImageUrl,
        project.original_image_url
      );

      for (const { selection, productImageBase64 } of selectionsWithImages) {
        if (!productImageBase64) continue;
        const category = selection.product.category as ProductCategory;
        const region = getBboxForCategory(category, detectedObjects, roomType);
        const targetLabel =
          CATEGORY_LABELS[category] || category.replace(/_/g, " ");
        const res = await fetch("/api/chat-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomImageBase64: currentBase,
            prompt: `Replace the ${targetLabel.toLowerCase()} with: ${selection.product.name}.`,
            region: { x: region.x, y: region.y, width: region.width, height: region.height },
            replacementImageBase64: `data:image/png;base64,${productImageBase64}`,
            detectedObjects: objectInventory.length ? objectInventory : undefined,
            targetCategory: category,
            targetLabel,
            targetProductName: selection.product.name,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof data?.error === "string" ? data.error : `Apply failed (${res.status})`;
          setConceptError(msg);
          return;
        }
        if (data.imageBase64) {
          currentBase = `data:image/png;base64,${data.imageBase64}`;
        }
      }

      setCachedConcept(cacheKey, currentBase);
      pushConceptImage(currentBase);
      setStudioMode("concept");
    } catch (e) {
      setConceptError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setConceptLoading(false);
    }
  }, [project, conceptImageUrl, selections, selectedStyle, detectedObjects, pushConceptImage, setConceptLoading, setStudioMode]);

  const handleNewConceptWithStyle = useCallback(
    async (styleId: DesignStyle) => {
      if (!project?.original_image_url) return;
      setConceptError(null);
      setConceptLoading(true);
      setStylePickerOpen(false);
      try {
        const roomImageBase64 =
          project.original_image_url.startsWith("data:")
            ? project.original_image_url
            : `data:image/png;base64,${await getRoomImageBase64(project.original_image_url)}`;
        const spec = getStyleById(styleId as Parameters<typeof getStyleById>[0]);
        const res = await fetch("/api/style-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomImageBase64,
            styleId,
            styleSpec: spec?.masterPromptSpec,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setConceptError(data.error || `Request failed (${res.status})`);
          return;
        }
        if (data.imageBase64) {
          const dataUrl = `data:image/png;base64,${data.imageBase64}`;
          pushConceptImage(dataUrl);
          setStudioMode("concept");
          setSelectedStyle(styleId);
          setProject({
            ...project,
            design_style: styleId,
            updated_at: new Date().toISOString(),
          });
        } else {
          setConceptError("No image returned");
        }
      } catch (e) {
        setConceptError(e instanceof Error ? e.message : "New concept failed");
      } finally {
        setConceptLoading(false);
      }
    },
    [project, pushConceptImage, setConceptLoading, setStudioMode, setSelectedStyle, setProject]
  );

  const changeRoomInputRef = useRef<HTMLInputElement>(null);

  const handleDeselectAll = useCallback(() => {
    clearSelections();
    setSelectedRegion(null);
  }, [clearSelections, setSelectedRegion]);

  const handleChangeRoom = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !project) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProject({
          ...project,
          original_image_url: dataUrl,
          updated_at: new Date().toISOString(),
        });
        setConceptImageUrl(null);
        clearSelections();
        setSelectedRegion(null);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [project, setProject, setConceptImageUrl, clearSelections, setSelectedRegion]
  );

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = project?.name || "Design Studio";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        if ((err as Error).name !== "AbortError") await navigator.clipboard?.writeText(url);
      }
    } else {
      await navigator.clipboard?.writeText(url);
    }
  }, [project?.name]);

  const handleDownload = useCallback(async () => {
    const url =
      studioMode === "concept" && conceptImageUrl
        ? conceptImageUrl
        : project?.original_image_url;
    if (!url) return;
    try {
      let blob: Blob;
      if (url.startsWith("data:")) {
        const res = await fetch(url);
        blob = await res.blob();
      } else {
        const res = await fetch(url, { mode: "cors" });
        blob = await res.blob();
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `luxeplan-${studioMode === "concept" ? "concept" : "room"}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, [studioMode, conceptImageUrl, project?.original_image_url]);

  return (
    <div className="min-h-14 pt-[env(safe-area-inset-top)] bg-lx-white border-b border-lx-linen rounded-b-[var(--lx-radius-xl)]">
      {/* Two rows on mobile: row 1 = logo + project; row 2 = scrollable actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 md:gap-5 px-4 py-2 md:py-0 md:px-5 flex-shrink-0 border-b border-lx-linen md:border-b-0">
          <LuxeLogo size="large" />
          <div className="w-[1px] h-5 bg-lx-linen hidden md:block" />

          {isEditing ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              autoFocus
              className="text-[0.8125rem] font-sans text-lx-charcoal bg-transparent border-b border-lx-accent outline-none pb-0.5 w-32 md:w-48 min-h-[44px]"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[0.8125rem] font-sans text-lx-charcoal hover:text-lx-accent transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center"
            >
              {projectName}
            </button>
          )}
        </div>

        {/* Mobile: scrollable row; Desktop: no scroll, wrap to fit */}
        <div className="overflow-x-auto md:overflow-visible overflow-y-hidden flex-1 min-w-0 md:min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 md:py-0 md:px-5 flex-nowrap md:flex-wrap w-max md:w-full md:justify-start md:gap-x-3 md:gap-y-2">
      {/* Center: Mode toggles */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Undo / Redo */}
        <div className="flex border border-lx-linen rounded-[var(--lx-radius-md)] overflow-hidden">
          <button
            onClick={undoConcept}
            disabled={!canUndo}
            title="Undo"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 py-1.5 text-lx-stone hover:text-lx-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
          </button>
          <button
            onClick={redoConcept}
            disabled={!canRedo}
            title="Redo"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 py-1.5 text-lx-stone hover:text-lx-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10" />
            </svg>
          </button>
        </div>

        {/* Before/After toggle */}
        <button
          onClick={toggleBeforeAfter}
          className={`min-h-[44px] flex items-center px-3 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] transition-all duration-300 rounded-[var(--lx-radius-md)] ${
            showBeforeAfter
              ? "bg-lx-charcoal text-lx-ivory"
              : "bg-transparent text-lx-stone hover:text-lx-charcoal border border-lx-linen hover:border-lx-sand"
          }`}
        >
          Before / After
        </button>

        {/* Live / Concept toggle */}
        <div className="flex border border-lx-linen rounded-[var(--lx-radius-md)] overflow-hidden">
          <button
            onClick={() => setStudioMode("live")}
            className={`min-h-[44px] flex items-center px-3 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] transition-all duration-300 ${
              studioMode === "live"
                ? "bg-lx-charcoal text-lx-ivory"
                : "text-lx-stone hover:text-lx-charcoal"
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setStudioMode("concept")}
            disabled={!conceptImageUrl}
            className={`min-h-[44px] flex items-center px-3 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              studioMode === "concept"
                ? "bg-lx-charcoal text-lx-ivory"
                : "text-lx-stone hover:text-lx-charcoal"
            }`}
          >
            Concept
          </button>
        </div>

        {/* See it in your space — full concept render (cached when possible) */}
        <button
          onClick={handleSeeInYourSpace}
          disabled={!project?.original_image_url || selections.length === 0 || conceptLoading}
          className="btn-primary min-h-[44px] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          title="Generate full photoreal image with all selections (AI render, cached for same selections)"
        >
          {conceptLoading ? "Generating…" : "See it in your space"}
        </button>

        {/* New concept — change style and regenerate initial concept image */}
        <div className="relative">
          <button
            onClick={() => setStylePickerOpen((o) => !o)}
            disabled={!project?.original_image_url || conceptLoading}
            className="min-h-[44px] flex items-center px-3 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] bg-transparent text-lx-stone hover:text-lx-charcoal border border-lx-linen hover:border-lx-sand rounded-[var(--lx-radius-md)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Pick a different style and generate a new initial concept image"
          >
            New concept
          </button>
          {stylePickerOpen && (
            <>
              <div
                className="fixed inset-0 z-[100]"
                aria-hidden
                onClick={() => setStylePickerOpen(false)}
              />
              {/* Fixed bottom sheet — same position on all screen sizes */}
              <div className="fixed inset-x-0 bottom-0 z-[101] max-h-[70vh] overflow-y-auto rounded-t-[var(--lx-radius-xl)] border border-lx-linen border-b-0 bg-lx-white shadow-2xl py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <p className="px-4 py-2 text-[0.625rem] font-sans uppercase tracking-wider text-lx-warm-gray">
                  Choose style — new concept image
                </p>
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleNewConceptWithStyle(style.id as DesignStyle)}
                    className="w-full text-left px-4 py-3 text-[0.8125rem] font-sans text-lx-charcoal hover:bg-lx-linen active:bg-lx-linen transition-colors min-h-[44px] flex items-center"
                  >
                    {style.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {conceptError && (
          <p className="text-[0.625rem] text-lx-error max-w-[140px] truncate flex-shrink-0" title={conceptError}>
            {conceptError}
          </p>
        )}
      </div>

      {/* Right: Budget + Actions */}
      <div className="flex items-center gap-2 md:gap-5 flex-shrink-0">
        {/* Budget display */}
        <div className="text-right">
          {budget.total_low > 0 ? (
            <motion.div
              key={`${budget.total_low}-${budget.total_high}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[0.5625rem] font-sans text-lx-warm-gray uppercase tracking-[0.1em]">
                Estimated Budget
              </p>
              <p className="font-editorial-medium text-lx-charcoal text-[1.0625rem] tracking-tight">
                ${budget.total_low.toLocaleString()} —{" "}
                ${budget.total_high.toLocaleString()}
              </p>
            </motion.div>
          ) : (
            <p className="text-caption">No selections yet</p>
          )}
        </div>

        <div className="w-[1px] h-5 bg-lx-linen" />

        {/* Deselect all */}
        <button
          onClick={handleDeselectAll}
          className="min-h-[44px] flex items-center gap-1.5 px-2 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] text-lx-stone hover:text-lx-charcoal transition-colors duration-200"
          title="Clear all surface selections"
        >
          Deselect all
        </button>

        {/* Change Room — hidden file input */}
        <input
          ref={changeRoomInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChangeRoom}
        />
        <button
          onClick={() => changeRoomInputRef.current?.click()}
          className="min-h-[44px] flex items-center gap-1.5 px-2 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] text-lx-stone hover:text-lx-charcoal transition-colors duration-200"
          title="Load a different room photo"
        >
          Change Room
        </button>

        {/* Save version */}
        <button
          onClick={saveVersion}
          className="min-h-[44px] flex items-center gap-1.5 px-2 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] text-lx-stone hover:text-lx-charcoal transition-colors duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M11 13H3a1 1 0 01-1-1V2a1 1 0 011-1h6l3 3v8a1 1 0 01-1 1z"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 13V8H5v5M5 1v3h3"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Save
          {versions.length > 0 && (
            <span className="text-lx-warm-gray ml-0.5">
              v{versions.length}
            </span>
          )}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="min-h-[44px] flex items-center gap-1.5 px-2 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] text-lx-stone hover:text-lx-charcoal transition-colors duration-200"
          title="Share project link"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M10.5 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3.5 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM10.5 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M4.85 7.81l4.3 2.38M9.15 4.31l-4.3 2.38"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          Share
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="min-h-[44px] flex items-center gap-1.5 px-2 py-1.5 text-[0.625rem] font-sans uppercase tracking-[0.1em] text-lx-stone hover:text-lx-charcoal transition-colors duration-200"
          title="Download current view"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
