"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useApplySelectionToImage } from "@/hooks/useApplySelectionToImage";

export default function StudioBottomBar() {
  const removeSelection = useProjectStore((s) => s.removeSelection);
  const project = useProjectStore((s) => s.project);
  const conceptLoading = useProjectStore((s) => s.conceptLoading);

  const { applyToImage, loading: applyLoading, error: applyError, activeSelection } = useApplySelectionToImage();
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const mobileOptionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOptionsOpen) return;
    const close = (e: MouseEvent) => {
      if (mobileOptionsRef.current && !mobileOptionsRef.current.contains(e.target as Node)) {
        setMobileOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mobileOptionsOpen]);

  const handleReset = () => {
    if (activeSelection) removeSelection(activeSelection.id);
  };

  return (
    <div className="pb-[env(safe-area-inset-bottom)] bg-lx-white border-t border-lx-linen rounded-t-[var(--lx-radius-xl)]">
      {/* Mobile: status + Options dropdown (Apply to image is in Curated Collection header) */}
      <div ref={mobileOptionsRef} className="flex sm:hidden items-center gap-2 min-h-[44px] px-4 py-2">
        <span className="text-[0.75rem] font-sans text-lx-warm-gray truncate min-w-0 flex-1">
          {activeSelection ? activeSelection.product.name : "No product selected for this surface"}
        </span>
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileOptionsOpen((o) => !o)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[var(--lx-radius-md)] border border-lx-linen text-lx-stone hover:text-lx-charcoal hover:border-lx-sand"
            aria-expanded={mobileOptionsOpen}
            aria-haspopup="true"
          >
            <span className="text-[0.625rem] font-sans uppercase tracking-wider">Options</span>
          </button>
          {mobileOptionsOpen && (
            <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[160px] py-1 rounded-[var(--lx-radius-md)] border border-lx-linen bg-lx-white shadow-xl">
              <button type="button" onClick={() => { handleReset(); setMobileOptionsOpen(false); }} disabled={!activeSelection} className="w-full text-left min-h-[44px] px-4 py-2 text-[0.8125rem] font-sans text-lx-charcoal hover:bg-lx-linen disabled:opacity-50">
                Reset
              </button>
              <button type="button" onClick={() => setMobileOptionsOpen(false)} className="w-full text-left min-h-[44px] px-4 py-2 text-[0.8125rem] font-sans text-lx-warm-gray">
                Rotate (coming soon)
              </button>
              <button type="button" onClick={() => setMobileOptionsOpen(false)} className="w-full text-left min-h-[44px] px-4 py-2 text-[0.8125rem] font-sans text-lx-warm-gray">
                Pattern (coming soon)
              </button>
              <button type="button" onClick={() => setMobileOptionsOpen(false)} className="w-full text-left min-h-[44px] px-4 py-2 text-[0.8125rem] font-sans text-lx-warm-gray">
                Grout (coming soon)
              </button>
              {applyError && (
                <p className="px-4 py-1 text-[0.625rem] text-lx-error" title={applyError}>{applyError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop / tablet: full layout */}
      <div className="hidden sm:flex min-h-14 flex-row items-center justify-between gap-4 px-5 py-4">
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
              onClick={applyToImage}
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
    </div>
  );
}
