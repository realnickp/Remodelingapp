"use client";

import { useState, useRef, useEffect } from "react";
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

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatMessages = useProjectStore((s) => s.chatMessages);
  const addChatMessage = useProjectStore((s) => s.addChatMessage);
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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[600px] min-w-0 px-4 pb-[env(safe-area-inset-bottom)]">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* ── Collapsed: floating toggle button ── */
          <motion.button
            key="toggle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="ml-auto flex items-center gap-2 bg-lx-white rounded-full border-2 border-lx-linen shadow-xl px-4 py-2.5 min-h-[44px] hover:border-lx-sand transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lx-accent">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="text-[0.8125rem] font-sans text-lx-charcoal">Edit with AI</span>
            {chatMessages.length > 0 && (
              <span className="bg-lx-accent text-lx-white text-[0.625rem] font-sans rounded-full w-4 h-4 flex items-center justify-center">
                {chatMessages.filter((m) => m.role === "user").length}
              </span>
            )}
          </motion.button>
        ) : (
          /* ── Expanded: full chat panel ── */
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Message history */}
            <AnimatePresence>
              {chatMessages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  ref={scrollRef}
                  className="mb-2 max-h-[50vh] md:max-h-[260px] overflow-y-auto rounded-[--lx-radius-lg] bg-lx-charcoal backdrop-blur-sm p-3 space-y-2 border border-lx-espresso"
                >
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
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="min-h-[44px] px-2 text-lx-accent hover:text-lx-accent-light disabled:opacity-30 text-[0.6875rem] font-sans uppercase tracking-wider"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal leading-none"
                  >
                    &times;
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <div className="flex items-center gap-2 bg-lx-white rounded-[--lx-radius-lg] border-2 border-lx-linen shadow-xl px-4 py-2.5">
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal transition-colors flex-shrink-0"
                title="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="w-px h-5 bg-lx-linen flex-shrink-0" />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Upload image button (paperclip) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={chatLoading}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal disabled:opacity-30 transition-colors"
                title="Upload product image"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Paste URL button (link icon) */}
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={chatLoading}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-warm-gray hover:text-lx-charcoal disabled:opacity-30 transition-colors"
                title="Paste product image URL"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </button>

              {/* Region chip */}
              {selectedRegion && (
                <span className="inline-flex items-center gap-1 bg-lx-charcoal text-white rounded-full px-2 py-0.5 text-[0.6875rem] whitespace-nowrap border border-lx-stone">
                  Region selected
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-white hover:text-red-400 ml-0.5 leading-none"
                  >
                    &times;
                  </button>
                </span>
              )}

              {/* Replacement image preview chip */}
              {replacementImageBase64 && (
                <span className="inline-flex items-center gap-1.5 bg-lx-charcoal text-white rounded-full px-1.5 py-0.5 whitespace-nowrap border border-lx-stone">
                  <img
                    src={replacementImageBase64}
                    alt="Product"
                    className="w-5 h-5 rounded object-cover"
                  />
                  <span className="text-[0.6875rem]">Product</span>
                  <button
                    onClick={() => setReplacementImageBase64(null)}
                    className="text-white hover:text-red-400 leading-none text-xs"
                  >
                    &times;
                  </button>
                </span>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe a change..."
                disabled={chatLoading}
                className="flex-1 bg-transparent outline-none text-[0.9375rem] text-lx-black placeholder:text-lx-stone disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={chatLoading || (!input.trim() && !replacementImageBase64)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-accent hover:text-lx-accent-light disabled:opacity-30 transition-colors"
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
