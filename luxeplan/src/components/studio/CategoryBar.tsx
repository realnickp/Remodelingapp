"use client";

import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import type { ProductCategory, RoomType } from "@/types";

// Roomvo-style order: primary surfaces first (Floors, Countertops, Walls, Backsplash)
const KITCHEN_CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "flooring", label: "Floors" },
  { id: "countertops", label: "Countertops" },
  { id: "walls", label: "Walls" },
  { id: "backsplash", label: "Backsplash" },
  { id: "cabinets", label: "Cabinetry" },
  { id: "faucets", label: "Faucets" },
  { id: "sinks", label: "Sinks" },
  { id: "islands", label: "Islands" },
  { id: "lighting", label: "Lighting" },
  { id: "hardware", label: "Hardware" },
  { id: "appliances", label: "Appliances" },
  { id: "storage", label: "Storage" },
  { id: "windows", label: "Windows" },
  { id: "doors", label: "Doors" },
];

const BATHROOM_CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "flooring", label: "Floors" },
  { id: "countertops", label: "Countertops" },
  { id: "walls", label: "Walls" },
  { id: "backsplash", label: "Tile" },
  { id: "vanity", label: "Vanity" },
  { id: "faucets", label: "Faucets" },
  { id: "sinks", label: "Sinks" },
  { id: "mirrors", label: "Mirrors" },
  { id: "lighting", label: "Lighting" },
  { id: "shower", label: "Shower" },
  { id: "tub", label: "Bathtubs" },
  { id: "toilet", label: "Toilets" },
  { id: "hardware", label: "Hardware" },
  { id: "storage", label: "Storage" },
  { id: "windows", label: "Windows" },
  { id: "doors", label: "Doors" },
];

export default function CategoryBar() {
  const activeCategory = useProjectStore((s) => s.activeCategory);
  const setActiveCategory = useProjectStore((s) => s.setActiveCategory);
  const project = useProjectStore((s) => s.project);
  const selections = useProjectStore((s) => s.selections);

  const roomType: RoomType = project?.room_type || "kitchen";
  const categories =
    roomType === "kitchen" ? KITCHEN_CATEGORIES : BATHROOM_CATEGORIES;

  const selectedCategories = new Set(
    selections.map((s) => s.product.category)
  );

  return (
    <div className="bg-lx-white border-b border-lx-linen px-4 py-2 rounded-b-[var(--lx-radius-lg)]">
      <div className="overflow-x-auto overflow-y-hidden md:overflow-visible -mx-4 pl-4 pr-4 md:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-1.5 min-w-max md:min-w-0 snap-x snap-mandatory md:snap-none pr-4">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const hasSelection = selectedCategories.has(cat.id);

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                relative px-3.5 py-1.5 min-h-[44px] flex items-center snap-center flex-shrink-0
                text-[0.6875rem] font-sans tracking-[0.06em] uppercase
                border rounded-sm cursor-pointer
                transition-all duration-200
                ${
                  isActive
                    ? "bg-lx-black text-lx-ivory border-lx-black font-medium"
                    : hasSelection
                    ? "bg-lx-cream text-lx-charcoal border-lx-sand hover:bg-lx-linen"
                    : "bg-transparent text-lx-warm-gray border-lx-linen hover:border-lx-sand hover:text-lx-charcoal hover:bg-lx-cream/50"
                }
              `}
            >
              {cat.label}
              {hasSelection && !isActive && (
                <motion.div
                  layoutId="category-dot"
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-lx-accent"
                />
              )}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
