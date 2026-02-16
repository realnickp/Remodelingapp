"use client";

import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import type { RoomType } from "@/types";

const ROOMS: {
  type: RoomType;
  title: string;
  description: string;
  gradient: string;
}[] = [
  {
    type: "kitchen",
    title: "Kitchen",
    description: "Countertops, cabinetry, appliances, islands, and more",
    gradient: "from-amber-50 to-orange-50",
  },
  {
    type: "bathroom",
    title: "Bathroom",
    description: "Vanities, showers, tubs, tile, fixtures, and more",
    gradient: "from-sky-50 to-blue-50",
  },
];

export default function RoomTypeStep() {
  const setSelectedRoomType = useProjectStore((s) => s.setSelectedRoomType);
  const setOnboardingStep = useProjectStore((s) => s.setOnboardingStep);

  const handleSelect = (type: RoomType) => {
    setSelectedRoomType(type);
    setOnboardingStep("style");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[640px] mx-auto"
    >
      <div className="text-center mb-10">
        <p className="text-subtitle mb-3">Step 1 of 4</p>
        <h2 className="font-editorial-medium text-lx-charcoal text-[1.75rem] mb-2">
          What are you redesigning?
        </h2>
        <p className="text-body max-w-[360px] mx-auto">
          Choose your room type to get started with curated products and layouts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {ROOMS.map((room) => (
          <motion.button
            key={room.type}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(room.type)}
            className={`group relative p-8 bg-gradient-to-br ${room.gradient} border border-lx-linen hover:border-lx-sand transition-colors duration-300 text-left cursor-pointer`}
          >
            <div className="mb-4">
              <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center mb-4">
                {room.type === "kitchen" ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-lx-charcoal">
                    <rect x="2" y="3" width="16" height="14" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="6" cy="6.5" r="1" fill="currentColor" />
                    <circle cx="10" cy="6.5" r="1" fill="currentColor" />
                    <circle cx="14" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-lx-charcoal">
                    <rect x="3" y="2" width="14" height="16" rx="7" stroke="currentColor" strokeWidth="1.2" />
                    <ellipse cx="10" cy="10" rx="4" ry="5" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="10" cy="7" r="0.8" fill="currentColor" />
                  </svg>
                )}
              </div>
              <h3 className="font-editorial-medium text-lx-charcoal text-[1.25rem] mb-1">
                {room.title}
              </h3>
              <p className="text-caption leading-relaxed">{room.description}</p>
            </div>
            <div className="w-6 h-[1px] bg-lx-sand group-hover:w-10 group-hover:bg-lx-accent transition-all duration-300" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
