"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";

/**
 * StudioCanvas — shows the room photo (live) or the AI-generated concept.
 *
 * Live mode: base room photo only. "See it in your space" generates the photoreal render.
 * Concept mode: shows the AI-generated image from /api/concept-render.
 */
export default function StudioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const project = useProjectStore((s) => s.project);
  const selections = useProjectStore((s) => s.selections);
  const showBeforeAfter = useProjectStore((s) => s.showBeforeAfter);
  const studioMode = useProjectStore((s) => s.studioMode);
  const conceptImageUrl = useProjectStore((s) => s.conceptImageUrl);
  const conceptLoading = useProjectStore((s) => s.conceptLoading);
  const removeSelection = useProjectStore((s) => s.removeSelection);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [conceptImage, setConceptImage] = useState<HTMLImageElement | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Load base (room) image
  useEffect(() => {
    if (!project?.original_image_url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBaseImage(img);
      setImageLoaded(true);
    };
    img.src = project.original_image_url;
  }, [project?.original_image_url]);

  // Load concept image
  useEffect(() => {
    if (!conceptImageUrl) {
      setConceptImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setConceptImage(img);
    img.onerror = () => setConceptImage(null);
    img.src = conceptImageUrl;
  }, [conceptImageUrl]);

  // Render canvas — base photo or concept image only
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const showConcept = studioMode === "concept" && conceptImage;
    const src = showConcept ? conceptImage : baseImage;
    if (!src) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    const imgAspect = src.width / src.height;
    const cAspect = cw / ch;
    let dw: number, dh: number, dx: number, dy: number;
    // Mobile: show FULL image (contain); desktop: fill frame (cover)
    const useContain = cw < 640;
    if (useContain) {
      const scale = Math.min(cw / src.width, ch / src.height);
      dw = src.width * scale;
      dh = src.height * scale;
      dx = (cw - dw) / 2;
      dy = (ch - dh) / 2;
    } else {
      if (imgAspect > cAspect) {
        dh = ch; dw = ch * imgAspect; dx = (cw - dw) / 2; dy = 0;
      } else {
        dw = cw; dh = cw / imgAspect; dx = 0; dy = (ch - dh) / 2;
      }
    }
    ctx.drawImage(src, dx, dy, dw, dh);
  }, [baseImage, conceptImage, studioMode]);

  useEffect(() => {
    renderCanvas();
    window.addEventListener("resize", renderCanvas);
    const container = containerRef.current;
    if (container) {
      const ro = new ResizeObserver(() => renderCanvas());
      ro.observe(container);
      return () => {
        window.removeEventListener("resize", renderCanvas);
        ro.disconnect();
      };
    }
    return () => window.removeEventListener("resize", renderCanvas);
  }, [renderCanvas]);

  // Slider drag — prevent browser back on touch when near left edge
  const handleSliderMove = useCallback(
    (clientX: number) => {
      if (!isDraggingSlider || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSliderPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    },
    [isDraggingSlider]
  );

  const handleSliderTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingSlider(true);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleSliderMove(e.clientX);
    const onUp = () => setIsDraggingSlider(false);
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      handleSliderMove(e.touches[0]?.clientX ?? 0);
    };
    const onTouchEnd = () => setIsDraggingSlider(false);
    if (isDraggingSlider) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDraggingSlider, handleSliderMove]);

  const catLabel: Record<string, string> = {
    faucets: "Faucet", sinks: "Sink", countertops: "Countertop",
    cabinets: "Cabinet", backsplash: "Backsplash", flooring: "Flooring",
    lighting: "Lighting", mirrors: "Mirror", hardware: "Hardware",
    appliances: "Appliance", shower: "Shower", tub: "Tub",
    vanity: "Vanity", toilet: "Toilet",
  };

  return (
    <div ref={containerRef} className="studio-canvas w-full h-full film-grain relative">
      {/* Loading skeleton */}
      <AnimatePresence>
        {!imageLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 skeleton"
          />
        )}
      </AnimatePresence>

      {/* Generating overlay */}
      <AnimatePresence>
        {conceptLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-lx-black/60 backdrop-blur-sm flex items-center justify-center z-10"
          >
            <p className="text-subtitle text-lx-sand">Generating realistic view…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas — clean base photo or concept image, nothing on top */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Selection chips — bottom-right corner, live mode only */}
      <AnimatePresence>
        {selections.length > 0 && studioMode === "live" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-5 right-5 flex flex-col gap-1.5 max-w-[240px] z-10"
          >
            <p className="text-[0.5625rem] font-sans text-white/60 uppercase tracking-[0.12em] mb-0.5">
              {selections.length} Selected
            </p>
            {selections.map((sel) => (
              <motion.div
                key={sel.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 bg-lx-black/75 backdrop-blur-sm pl-3 pr-1.5 py-1.5 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[0.625rem] font-sans text-lx-ivory truncate leading-tight">
                    {sel.product.name}
                  </p>
                  <p className="text-[0.5rem] font-sans text-white/45 uppercase tracking-wider leading-tight">
                    {catLabel[sel.product.category] || sel.product.category}
                    {sel.product.material ? ` · ${sel.product.material}` : ""}
                    {sel.product.finish ? ` · ${sel.product.finish}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeSelection(sel.id)}
                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white"
                  title="Remove"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              </motion.div>
            ))}
            <p className="text-[0.5rem] font-sans text-white/30 mt-0.5 italic">
              See it in your space = photoreal render
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Before/After slider */}
      <AnimatePresence>
        {showBeforeAfter && imageLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ touchAction: "pan-y" }}
          >
            {conceptImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={conceptImageUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />
            )}

            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project?.original_image_url} alt="Before" className="w-full h-full object-cover" />
              <div className="absolute top-6 left-6">
                <span className="text-subtitle text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1.5">Before</span>
              </div>
            </div>

            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white/70 cursor-ew-resize z-10"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={() => setIsDraggingSlider(true)}
              onTouchStart={handleSliderTouchStart}
            >
              {/* Mobile: 44px invisible touch target so edge drag doesn't trigger browser back */}
              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-11 min-w-[44px] md:hidden"
                style={{ touchAction: "none" }}
                aria-hidden
              />
              <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M4 3L1 7L4 11M10 3L13 7L10 11" stroke="#1a1714" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="absolute top-6 right-6">
              <span className="text-subtitle text-white/80 bg-black/30 backdrop-blur-sm px-3 py-1.5">After</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
