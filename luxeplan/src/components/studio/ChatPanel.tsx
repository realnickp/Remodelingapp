"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { v4 as uuid } from "uuid";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    faucets: "Faucet", sinks: "Sink", countertops: "Countertop", cabinets: "Cabinet",
    backsplash: "Backsplash", flooring: "Floor", lighting: "Lighting", mirrors: "Mirror",
    hardware: "Hardware", appliances: "Appliance", shower: "Shower", tub: "Bathtub",
    vanity: "Vanity", toilet: "Toilet", walls: "Wall", islands: "Island", storage: "Storage",
    windows: "Window", doors: "Door", fixtures: "Fixture",
  };
  return labels[category] || category;
}

const PANEL_DEFAULT_BOTTOM_REM = 5;
const PANEL_WIDTH_PX = 400;

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [mobileAttachOpen, setMobileAttachOpen] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragInitialRef = useRef({ x: 0, y: 0 });
  const panelSizeRef = useRef({ w: PANEL_WIDTH_PX, h: 320 });

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    setIsDesktop(m.matches);
    const l = () => setIsDesktop(m.matches);
    m.addEventListener("change", l);
    return () => m.removeEventListener("change", l);
  }, []);

  const chatMessages = useProjectStore((s) => s.chatMessages);
  const addChatMessage = useProjectStore((s) => s.addChatMessage);
  const clearChat = useProjectStore((s) => s.clearChat);
  const chatLoading = useProjectStore((s) => s.chatLoading);
  const setChatLoading = useProjectStore((s) => s.setChatLoading);
  const selectedRegion = useProjectStore((s) => s.selectedRegion);
  const setSelectedRegion = useProjectStore((s) => s.setSelectedRegion);
  const project = useProjectStore((s) => s.project);
  const conceptImageUrl = useProjectStore((s) => s.conceptImageUrl);
  const pushConceptImage = useProjectStore((s) => s.pushConceptImage);
  const setStudioMode = useProjectStore((s) => s.setStudioMode);
  const replacementImageBase64 = useProjectStore((s) => s.replacementImageBase64);
  const setReplacementImageBase64 = useProjectStore((s) => s.setReplacementImageBase64);
  const detectedObjects = useProjectStore((s) => s.detectedObjects);
  const activeCategory = useProjectStore((s) => s.activeCategory);
  const selections = useProjectStore((s) => s.selections);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length]);

  useEffect(() => {
    if (!mobileAttachOpen) return;
    const close = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setMobileAttachOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mobileAttachOpen]);

  // Desktop only: drag panel to move it
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    panelSizeRef.current = { w: rect.width, h: rect.height };
    dragInitialRef.current = { x: rect.left, y: rect.top };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const { w, h } = panelSizeRef.current;
      const x = Math.max(0, Math.min(window.innerWidth - w, dragInitialRef.current.x + dx));
      const y = Math.max(0, Math.min(window.innerHeight - h, dragInitialRef.current.y + dy));
      setDragPosition({ x, y });
    };
    const up = () => setIsDragging(false);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [isDragging]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setReplacementImageBase64(base64);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      const base64 = await urlToBase64(url);
      setReplacementImageBase64(base64);
      setUrlInput("");
      setShowUrlInput(false);
    } catch {
      // silently fail — user can retry
    }
  };

  const handleSend = async () => {
    const prompt = input.trim();
    const hasImage = !!replacementImageBase64;
    if ((!prompt && !hasImage) || chatLoading) return;

    const region = selectedRegion ?? undefined;

    const effectivePrompt = prompt || "Replace the selected region with the product shown in the attached image.";

    addChatMessage({
      id: uuid(),
      role: "user",
      content: effectivePrompt,
      region,
      timestamp: new Date().toISOString(),
    });

    setInput("");
    const sentReplacementImage = replacementImageBase64;
    setReplacementImageBase64(null);
    setChatLoading(true);

    try {
      // Edits are always applied to the generated concept image, not the original photo.
      if (!conceptImageUrl) {
        throw new Error("Generate a concept first: use \"See it in your space\" to create an image, then make edits.");
      }
      if (!project?.original_image_url) throw new Error("No room image available");

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

      const conceptImageBase64 = await toBase64(conceptImageUrl);
      const originalImageBase64 = await toBase64(project.original_image_url);

      // Build detected objects inventory for context
      const objectInventory = detectedObjects.map((obj) => ({
        label: obj.label,
        category: obj.category,
        region: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
      }));

      // Target element: only this category/product should be changed; rest of image must stay identical
      const activeSelection = selections.find((s) => s.product.category === activeCategory);
      const targetCategory = region ? activeCategory : undefined;
      const targetLabel = targetCategory ? formatCategoryLabel(targetCategory) : undefined;
      const targetProductName = activeSelection?.product.name;

      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImageBase64: conceptImageBase64,
          originalImageBase64,
          prompt: effectivePrompt,
          region: region || undefined,
          replacementImageBase64: sentReplacementImage || undefined,
          detectedObjects: objectInventory,
          targetCategory: targetCategory || undefined,
          targetLabel: targetLabel || undefined,
          targetProductName: targetProductName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Edit failed");
      }

      const newUrl = `data:image/png;base64,${data.imageBase64}`;
      pushConceptImage(newUrl);
      setStudioMode("concept");

      addChatMessage({
        id: uuid(),
        role: "assistant",
        content: "Edit applied successfully.",
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      addChatMessage({
        id: uuid(),
        role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "Something went wrong"}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setChatLoading(false);
      setSelectedRegion(null);
    }
  };

  return (
    <div className="relative md:absolute md:inset-x-0 md:bottom-14 md:z-20 px-2 sm:px-4 py-3 pb-3 md:pb-0 flex flex-col items-stretch md:items-end border-t border-lx-linen md:border-t-0 bg-lx-white md:bg-transparent shrink-0 min-h-[52px] touch-manipulation min-w-0">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* ── Collapsed: toggle overlays canvas so image never shrinks ── */
          <motion.button
            key="toggle"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="w-full md:w-auto md:min-w-[280px] flex items-center justify-center gap-2 btn-primary rounded-[var(--lx-radius-lg)] shadow-lg px-4 py-3 min-h-[48px] text-[0.9375rem] font-sans font-medium cursor-pointer select-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>Chat and Make Edits</span>
            {chatMessages.length > 0 && (
              <span className="bg-lx-accent text-lx-white text-[0.625rem] font-sans rounded-full w-4 h-4 flex items-center justify-center">
                {chatMessages.filter((m) => m.role === "user").length}
              </span>
            )}
          </motion.button>
        ) : (
          /* ── Expanded: on desktop fixed + draggable (web only); on mobile in-flow ── */
          <motion.div
            key="panel"
            ref={panelRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full max-w-[100%] md:max-w-[400px] bg-lx-white/95 backdrop-blur-sm rounded-t-[var(--lx-radius-xl)] border border-b-0 border-lx-linen shadow-2xl overflow-hidden ${isDesktop ? " fixed z-30" : ""}`}
            style={isDesktop
              ? (dragPosition !== null
                ? { left: dragPosition.x, top: dragPosition.y }
                : { bottom: `${PANEL_DEFAULT_BOTTOM_REM}rem`, left: "50%", transform: "translateX(-50%)" })
              : undefined}
          >
            {/* Web only: drag handle */}
            {isDesktop && (
              <div
                onMouseDown={handleDragStart}
                className="cursor-grab active:cursor-grabbing select-none py-2.5 px-3 border-b border-lx-linen bg-lx-cream/50 hover:bg-lx-linen/50 text-[0.6875rem] font-sans uppercase tracking-wider text-lx-warm-gray"
                title="Drag to move chat out of the way"
              >
                Drag to move
              </div>
            )}
            {/* Message history + clear */}
            <AnimatePresence>
              {chatMessages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  ref={scrollRef}
                  className="mb-2 max-h-[50vh] md:max-h-[260px] overflow-y-auto rounded-t-[var(--lx-radius-lg)] bg-lx-charcoal p-3 space-y-2 border border-lx-espresso border-t-0 relative"
                >
                  <div className="flex justify-end sticky top-0 -mt-1 pt-1 pb-1 bg-lx-charcoal z-10">
                    <button
                      type="button"
                      onClick={clearChat}
                      className="text-[0.625rem] font-sans uppercase tracking-wider text-white/70 hover:text-white"
                    >
                      Clear history
                    </button>
                  </div>
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-[--lx-radius-md] px-3 py-1.5 text-caption ${
                          msg.role === "user"
                            ? "bg-lx-charcoal text-white"
                            : "bg-lx-espresso text-white"
                        }`}
                      >
                        {msg.content}
                        {msg.region && (
                          <span className="ml-1.5 opacity-90 text-[0.625rem] text-white">
                            [region]
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-lx-espresso text-white rounded-[--lx-radius-md] px-3 py-1.5 text-caption">
                        <span className="inline-flex gap-1">
                          <span className="animate-pulse">Editing</span>
                          <span className="animate-pulse delay-100">.</span>
                          <span className="animate-pulse delay-200">.</span>
                          <span className="animate-pulse delay-300">.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* URL input popover */}
            <AnimatePresence>
              {showUrlInput && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mb-2 flex items-center gap-2 bg-lx-white rounded-[--lx-radius-md] border border-lx-linen shadow px-3 py-1.5"
                >
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                    placeholder="Paste product image URL..."
                    className="flex-1 bg-transparent outline-none text-caption text-lx-charcoal placeholder:text-lx-warm-gray"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="min-h-[44px] px-2 text-lx-accent hover:text-lx-accent-light disabled:opacity-30 text-[0.6875rem] font-sans uppercase tracking-wider"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal leading-none"
                  >
                    &times;
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile: chips on their own row so input bar always fits */}
            {(selectedRegion || replacementImageBase64) && (
              <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 px-1 -mx-1 min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {selectedRegion && (
                  <span className="inline-flex items-center gap-1 bg-lx-charcoal text-white rounded-full px-2 py-1 text-[0.6875rem] whitespace-nowrap border border-lx-stone flex-shrink-0">
                    Region
                    <button type="button" onClick={() => setSelectedRegion(null)} className="text-white hover:text-red-400 ml-0.5 leading-none" aria-label="Clear region">&times;</button>
                  </span>
                )}
                {replacementImageBase64 && (
                  <span className="inline-flex items-center gap-1.5 bg-lx-charcoal text-white rounded-full px-1.5 py-1 whitespace-nowrap border border-lx-stone flex-shrink-0">
                    <img src={replacementImageBase64} alt="Product" className="w-4 h-4 rounded object-cover" />
                    <span className="text-[0.6875rem]">Product</span>
                    <button type="button" onClick={() => setReplacementImageBase64(null)} className="text-white hover:text-red-400 leading-none text-xs" aria-label="Remove">&times;</button>
                  </span>
                )}
              </div>
            )}

            {/* Input bar — mobile: compact row that always fits; desktop: full row */}
            <div className="flex items-center gap-1.5 md:gap-2 bg-lx-white rounded-[--lx-radius-lg] border-2 border-lx-linen shadow-xl px-2 md:px-4 py-2 md:py-2.5 min-w-0">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-[44px] min-w-[40px] md:min-w-[44px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal flex-shrink-0"
                title="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Desktop: divider + Upload + URL */}
              <div className="hidden md:block w-px h-5 bg-lx-linen flex-shrink-0" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={chatLoading}
                className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center text-lx-warm-gray hover:text-lx-charcoal disabled:opacity-30"
                title="Upload product image"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={chatLoading}
                className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center text-lx-warm-gray hover:text-lx-charcoal disabled:opacity-30"
                title="Paste product image URL"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </button>

              {/* Mobile: single Attach dropdown */}
              <div ref={attachRef} className="relative md:hidden flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileAttachOpen((o) => !o)}
                  disabled={chatLoading}
                  className="min-h-[44px] min-w-[40px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal disabled:opacity-30"
                  aria-expanded={mobileAttachOpen}
                  title="Attach"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                {mobileAttachOpen && (
                  <div className="absolute left-0 bottom-full mb-1 z-50 min-w-[160px] py-1 rounded-[var(--lx-radius-md)] border border-lx-linen bg-lx-white shadow-xl">
                    <button type="button" onClick={() => { fileInputRef.current?.click(); setMobileAttachOpen(false); }} disabled={chatLoading} className="w-full text-left min-h-[44px] px-4 py-2 text-[0.8125rem] font-sans text-lx-charcoal hover:bg-lx-linen flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span>Upload image</span>
                    </button>
                    <button type="button" onClick={() => { setShowUrlInput(true); setMobileAttachOpen(false); }} disabled={chatLoading} className="w-full text-left min-h-[44px] px-4 py-2 text-[0.8125rem] font-sans text-lx-charcoal hover:bg-lx-linen flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                      </svg>
                      <span>Paste URL</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop-only: region/product chips inline */}
              {selectedRegion && (
                <span className="hidden md:inline-flex items-center gap-1 bg-lx-charcoal text-white rounded-full px-2 py-0.5 text-[0.6875rem] whitespace-nowrap border border-lx-stone">
                  Region selected
                  <button type="button" onClick={() => setSelectedRegion(null)} className="text-white hover:text-red-400 ml-0.5 leading-none">&times;</button>
                </span>
              )}
              {replacementImageBase64 && (
                <span className="hidden md:inline-flex items-center gap-1.5 bg-lx-charcoal text-white rounded-full px-1.5 py-0.5 whitespace-nowrap border border-lx-stone">
                  <img src={replacementImageBase64} alt="Product" className="w-5 h-5 rounded object-cover" />
                  <span className="text-[0.6875rem]">Product</span>
                  <button type="button" onClick={() => setReplacementImageBase64(null)} className="text-white hover:text-red-400 leading-none text-xs">&times;</button>
                </span>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe a change..."
                disabled={chatLoading}
                className="flex-1 min-w-0 bg-transparent outline-none text-[0.9375rem] text-lx-black placeholder:text-lx-stone disabled:opacity-50"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={chatLoading || (!input.trim() && !replacementImageBase64)}
                className="min-h-[44px] min-w-[40px] md:min-w-[44px] flex items-center justify-center text-lx-accent hover:text-lx-accent-light disabled:opacity-30 flex-shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
