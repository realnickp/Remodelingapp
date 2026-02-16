"use client";

import { useState, useCallback } from "react";
import { useProjectStore } from "@/store/useProjectStore";

const CATEGORY_LABELS: Record<string, string> = {
  faucets: "Faucet", sinks: "Sink", countertops: "Countertop", cabinets: "Cabinet",
  backsplash: "Backsplash", flooring: "Floor", lighting: "Lighting", mirrors: "Mirror",
  hardware: "Hardware", appliances: "Appliance", shower: "Shower", tub: "Bathtub",
  vanity: "Vanity", toilet: "Toilet", walls: "Wall", islands: "Island", storage: "Storage",
  windows: "Window", doors: "Door", fixtures: "Fixture",
};

export default function StudioBottomBar() {
  const activeCategory = useProjectStore((s) => s.activeCategory);
  const selections = useProjectStore((s) => s.selections);
  const removeSelection = useProjectStore((s) => s.removeSelection);
  const project = useProjectStore((s) => s.project);
  const conceptImageUrl = useProjectStore((s) => s.conceptImageUrl);
  const detectedObjects = useProjectStore((s) => s.detectedObjects);
  const pushConceptImage = useProjectStore((s) => s.pushConceptImage);
  const setStudioMode = useProjectStore((s) => s.setStudioMode);
  const conceptLoading = useProjectStore((s) => s.conceptLoading);

  const activeSelection = selections.find((s) => s.product.category === activeCategory);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleReset = () => {
    if (activeSelection) removeSelection(activeSelection.id);
  };

  const handleApplyToImage = useCallback(async () => {
    if (!project?.original_image_url || !activeSelection) return;
    setApplyError(null);
    setApplyLoading(true);
    try {
      const currentImageUrl = conceptImageUrl ?? project.original_image_url;
      const toBase64 = async (url: string): Promise<string> => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      const roomImageBase64 = await toBase64(currentImageUrl);
      const targetLabel = CATEGORY_LABELS[activeSelection.product.category] || activeSelection.product.category;
      const detail = [activeSelection.product.name];
      if (activeSelection.product.material) detail.push(activeSelection.product.material);
      if (activeSelection.product.finish) detail.push(activeSelection.product.finish);
      const prompt = `Replace the ${targetLabel.toLowerCase()} with: ${detail.join(", ")}.`;
      const objectInventory = detectedObjects.map((obj) => ({
        label: obj.label,
        category: obj.category,
        region: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
      }));
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImageBase64,
          prompt,
          detectedObjects: objectInventory.length ? objectInventory : undefined,
          targetCategory: activeSelection.product.category,
          targetLabel,
          targetProductName: activeSelection.product.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || "Apply failed");
        return;
      }
      if (data.imageBase64) {
        const dataUrl = `data:image/png;base64,${data.imageBase64}`;
        pushConceptImage(dataUrl);
        setStudioMode("concept");
      } else {
        setApplyError("No image returned");
      }
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setApplyLoading(false);
    }
  }, [project?.original_image_url, conceptImageUrl, activeSelection, detectedObjects, pushConceptImage, setStudioMode]);

  return (
    <div className="min-h-14 pb-[env(safe-area-inset-bottom)] bg-lx-white border-t border-lx-linen flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-t-[var(--lx-radius-xl)]">
      {/* Current product for selected surface + Apply to image */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {activeSelection ? (
            <>
              <div className="flex-shrink-0 w-9 h-9 rounded-[var(--lx-radius-md)] border border-lx-linen overflow-hidden bg-lx-linen flex items-center justify-center">
                <span className="font-editorial text-lx-sand text-[0.875rem]">
                  {activeSelection.product.name.charAt(0)}
                </span>
              </div>
              <span className="text-[0.8125rem] font-sans text-lx-charcoal truncate">
                {activeSelection.product.name}
              </span>
            </>
          ) : (
            <span className="text-[0.8125rem] font-sans text-lx-warm-gray">
              No product selected for this surface
            </span>
          )}
        </div>
        {activeSelection && (
          <button
            type="button"
            onClick={handleApplyToImage}
            disabled={!project?.original_image_url || conceptLoading || applyLoading}
            className="w-full sm:w-auto btn-primary min-h-[44px] flex items-center justify-center rounded-[var(--lx-radius-lg)] disabled:opacity-50 disabled:cursor-not-allowed text-[0.625rem] py-2 px-4"
            title="Apply only this product to the image (targeted change)"
          >
            {applyLoading ? "Applying…" : "Apply to image"}
          </button>
        )}
        {applyError && (
          <p className="text-[0.625rem] text-lx-error" title={applyError}>
            {applyError}
          </p>
        )}
      </div>

      {/* Actions: Reset, Rotate, Pattern, Grout */}
      <div className="flex items-center gap-1 border border-lx-linen rounded-[var(--lx-radius-md)] overflow-hidden">
        <button
          type="button"
          onClick={handleReset}
          disabled={!activeSelection}
          className="min-h-[44px] flex items-center px-3 py-2 text-[0.625rem] font-sans uppercase tracking-[0.08em] text-lx-stone hover:text-lx-charcoal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Reset this surface"
        >
          Reset
        </button>
        <div className="w-px h-5 bg-lx-linen" />
        <button
          type="button"
          className="min-h-[44px] flex items-center px-3 py-2 text-[0.625rem] font-sans uppercase tracking-[0.08em] text-lx-stone hover:text-lx-charcoal transition-colors"
          title="Rotate pattern (coming soon)"
        >
          Rotate
        </button>
        <div className="w-px h-5 bg-lx-linen" />
        <button
          type="button"
          className="min-h-[44px] flex items-center px-3 py-2 text-[0.625rem] font-sans uppercase tracking-[0.08em] text-lx-stone hover:text-lx-charcoal transition-colors"
          title="Pattern options (coming soon)"
        >
          Pattern
        </button>
        <div className="w-px h-5 bg-lx-linen" />
        <button
          type="button"
          className="min-h-[44px] flex items-center px-3 py-2 text-[0.625rem] font-sans uppercase tracking-[0.08em] text-lx-stone hover:text-lx-charcoal transition-colors"
          title="Grout color (coming soon)"
        >
          Grout
        </button>
      </div>
    </div>
  );
}
