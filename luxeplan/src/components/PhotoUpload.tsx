"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import type { DesignStyle } from "@/types";
import { getStyleById, getStyleImagePath } from "@/lib/style-specs";

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function PhotoUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [styleRenderStatus, setStyleRenderStatus] = useState<string | null>(null);
  const [styleRenderError, setStyleRenderError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setUploadStep = useProjectStore((s) => s.setUploadStep);
  const setProject = useProjectStore((s) => s.setProject);
  const selectedRoomType = useProjectStore((s) => s.selectedRoomType);
  const selectedStyle = useProjectStore((s) => s.selectedStyle);
  const selectedLayout = useProjectStore((s) => s.selectedLayout);
  const pushConceptImage = useProjectStore((s) => s.pushConceptImage);
  const setStyleRenderItems = useProjectStore((s) => s.setStyleRenderItems);
  const setStyleRenderLoading = useProjectStore((s) => s.setStyleRenderLoading);
  const setStudioMode = useProjectStore((s) => s.setStudioMode);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        setPreview(url);
        setStyleRenderError(null);
        setUploadStep("uploading");

        // Create project
        setTimeout(() => {
          setUploadStep("analyzing");
          setProject({
            id: crypto.randomUUID(),
            name: "Untitled Project",
            room_type: selectedRoomType || "kitchen",
            original_image_url: url,
            design_style: selectedStyle || undefined,
            room_layout: selectedLayout || undefined,
            versions: [],
            current_version_id: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }, 1200);

        // If a style is selected, trigger the AI style render with full style spec
        if (selectedStyle) {
          const styleSpec = getStyleById(selectedStyle);
          const styleName = styleSpec?.title ?? selectedStyle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          setStyleRenderStatus(`Reimagining your space in ${styleName}…`);
          setStyleRenderLoading(true);
          setStyleRenderError(null);

          try {
            const moodboardBase64 = styleSpec
              ? await fetchImageAsBase64(getStyleImagePath(styleSpec))
              : undefined;

            const res = await fetch("/api/style-render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomImageBase64: url,
                styleId: selectedStyle,
                styleSpec: styleSpec?.masterPromptSpec,
                styleMoodboardBase64: moodboardBase64,
              }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.imageBase64) {
              const mime = "image/png";
              const dataUrl = `data:${mime};base64,${data.imageBase64}`;
              pushConceptImage(dataUrl);
              setStudioMode("concept");
              if (data.usedItems && Array.isArray(data.usedItems)) {
                setStyleRenderItems(data.usedItems);
              }
            } else {
              const msg = data.error || (res.ok ? "No image returned" : `Request failed (${res.status})`);
              setStyleRenderError(msg);
            }
          } catch (e) {
            setStyleRenderError(e instanceof Error ? e.message : "Style render failed");
          } finally {
            setStyleRenderLoading(false);
            setStyleRenderStatus(null);
            setUploadStep("ready");
          }
        } else {
          // No style selected — just finish after analysis delay
          setTimeout(() => {
            setUploadStep("ready");
          }, 1200 + 2800);
        }
      };
      reader.readAsDataURL(file);
    },
    [
      setUploadStep,
      setProject,
      selectedRoomType,
      selectedStyle,
      selectedLayout,
      pushConceptImage,
      setStyleRenderItems,
      setStyleRenderLoading,
      setStudioMode,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="relative w-full min-w-0 max-w-[640px] mx-auto">
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer
                w-full aspect-[16/10] max-w-[640px]
                flex flex-col items-center justify-center gap-6
                border transition-all duration-500
                ${
                  isDragging
                    ? "border-lx-accent bg-[rgba(139,115,85,0.04)]"
                    : "border-lx-linen hover:border-lx-sand bg-transparent"
                }
              `}
              style={{ borderStyle: "dashed" }}
            >
              {/* Upload icon */}
              <div className="w-12 h-12 flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="text-lx-sand"
                >
                  <path
                    d="M16 4v18M8 12l8-8 8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 22v4a2 2 0 002 2h20a2 2 0 002-2v-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-center px-8">
                <p className="text-body text-lx-charcoal mb-2">
                  Drop your photo here
                </p>
                <p className="text-caption">
                  or click to browse — kitchen or bathroom
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[640px] aspect-[16/10] relative overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Uploaded room"
              className="w-full h-full object-cover"
            />
            <AnalyzingOverlay styleRenderStatus={styleRenderStatus} styleRenderError={styleRenderError} onDismissError={() => setStyleRenderError(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalyzingOverlay({
  styleRenderStatus,
  styleRenderError,
  onDismissError,
}: {
  styleRenderStatus: string | null;
  styleRenderError: string | null;
  onDismissError: () => void;
}) {
  const uploadStep = useProjectStore((s) => s.uploadStep);
  const styleRenderLoading = useProjectStore((s) => s.styleRenderLoading);

  const isActive =
    uploadStep === "analyzing" ||
    uploadStep === "uploading" ||
    styleRenderLoading;

  // When loading finished but there was an error, show error state
  if (styleRenderError && !styleRenderLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-lx-black/50 flex items-end justify-center pb-8"
      >
        <div className="bg-lx-charcoal text-lx-sand px-4 py-3 rounded-lg max-w-md shadow-lg flex flex-col gap-2">
          <p className="text-subtitle">Style image couldn’t be generated</p>
          <p className="text-caption text-lx-sand/80">{styleRenderError}</p>
          <button
            type="button"
            onClick={onDismissError}
            className="mt-2 min-h-[44px] flex items-center justify-center w-full text-caption underline text-lx-ivory hover:no-underline"
          >
            Dismiss — continue to studio
          </button>
        </div>
      </motion.div>
    );
  }

  if (!isActive) return null;

  const steps = styleRenderStatus
    ? [
        { label: "Uploading image", done: uploadStep !== "uploading" },
        { label: styleRenderStatus, done: false },
      ]
    : [
        { label: "Uploading image", done: uploadStep !== "uploading" },
        { label: "Detecting surfaces", done: false },
        { label: "Mapping depth", done: false },
        { label: "Identifying anchors", done: false },
      ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-lx-black/60 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="text-center">
        <div className="mb-6">
          <motion.div
            className="w-8 h-[1px] bg-lx-ivory mx-auto"
            animate={{ scaleX: [0, 1, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </div>
        <p className="text-subtitle text-lx-sand mb-4">
          {styleRenderStatus ? "Designing Your Space" : "Analyzing Your Space"}
        </p>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <motion.p
              key={step.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: i * 0.4, duration: 0.5 }}
              className="text-caption text-lx-sand/70"
            >
              {step.label}
            </motion.p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
