"use client";

import React from "react";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import type { KitchenLayout, BathroomLayout, RoomLayout } from "@/types";

const KITCHEN_LAYOUTS: { id: KitchenLayout; title: string; svg: React.ReactNode }[] = [
  {
    id: "l-shape",
    title: "L-Shape",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="40" width="40" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "u-shape",
    title: "U-Shape",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="40" width="44" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="40" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "galley",
    title: "Galley",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="40" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "single-wall",
    title: "Single Wall",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "island",
    title: "Island",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="20" y="32" width="20" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "peninsula",
    title: "Peninsula",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="40" width="30" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "open-concept",
    title: "Open Concept",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="20" y="36" width="20" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    id: "g-shape",
    title: "G-Shape",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="40" width="44" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="40" y="8" width="12" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="20" y="8" width="20" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const BATHROOM_LAYOUTS: { id: BathroomLayout; title: string; svg: React.ReactNode }[] = [
  {
    id: "full-bath",
    title: "Full Bath",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="34" y="12" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <circle cx="18" cy="38" r="6" stroke="currentColor" strokeWidth="1" />
        <rect x="34" y="34" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "three-quarter",
    title: "Three-Quarter",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="16" height="14" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="34" y="12" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="34" y="34" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "half-bath",
    title: "Half Bath",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="14" y="8" width="32" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="18" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="34" y="36" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "jack-and-jill",
    title: "Jack & Jill",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="30" y1="8" x2="30" y2="52" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="12" y="14" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="38" y="14" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "master-suite",
    title: "Master Suite",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="18" height="14" rx="1" stroke="currentColor" strokeWidth="1" />
        <circle cx="42" cy="18" r="5" stroke="currentColor" strokeWidth="1" />
        <rect x="12" y="34" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="32" y="34" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "wet-room",
    title: "Wet Room",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="8" y="8" width="44" height="44" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="36" height="24" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="16" y="40" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "narrow-long",
    title: "Narrow & Long",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <rect x="14" y="4" width="32" height="52" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="18" y="8" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="18" y="24" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="32" y="42" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: "l-shape",
    title: "L-Shape",
    svg: (
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        <path d="M8 8h44v24H28v20H8V8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="12" y="14" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="36" y="14" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="12" y="36" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
];

export default function LayoutStep() {
  const selectedRoomType = useProjectStore((s) => s.selectedRoomType);
  const setSelectedLayout = useProjectStore((s) => s.setSelectedLayout);
  const setOnboardingStep = useProjectStore((s) => s.setOnboardingStep);

  const layouts = selectedRoomType === "bathroom" ? BATHROOM_LAYOUTS : KITCHEN_LAYOUTS;

  const handleSelect = (layout: RoomLayout) => {
    setSelectedLayout(layout);
    setOnboardingStep("upload");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[720px] mx-auto"
    >
      <div className="text-center mb-10">
        <p className="text-subtitle mb-3">Step 3 of 4</p>
        <h2 className="font-editorial-medium text-lx-charcoal text-[1.75rem] mb-2">
          Select your layout
        </h2>
        <p className="text-body max-w-[400px] mx-auto">
          Pick the floor plan closest to your{" "}
          {selectedRoomType === "bathroom" ? "bathroom" : "kitchen"}. This helps
          us optimize product placement.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {layouts.map((layout, i) => (
          <motion.button
            key={layout.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(layout.id)}
            className="group flex flex-col items-center p-4 border border-lx-linen hover:border-lx-sand bg-lx-white transition-colors duration-300 cursor-pointer"
          >
            <div className="w-16 h-16 text-lx-sand group-hover:text-lx-charcoal transition-colors duration-300 mb-3">
              {layout.svg}
            </div>
            <span className="text-[0.6875rem] font-sans text-lx-charcoal tracking-wide">
              {layout.title}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => setOnboardingStep("style")}
          className="text-caption hover:text-lx-charcoal transition-colors duration-300 cursor-pointer"
        >
          Back
        </button>
      </div>
    </motion.div>
  );
}
