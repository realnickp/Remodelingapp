"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import type { Product } from "@/types";

export default function ProductShowroom() {
  const activeCategory = useProjectStore((s) => s.activeCategory);
  const filteredProducts = useProjectStore((s) => s.filteredProducts);
  const selections = useProjectStore((s) => s.selections);
  const addSelection = useProjectStore((s) => s.addSelection);
  const removeSelection = useProjectStore((s) => s.removeSelection);

  const products = filteredProducts();
  const selectionByProductId = new Map(selections.map((s) => [s.product.id, s.id]));

  const handleProductClick = (product: Product) => {
    const existingSelectionId = selectionByProductId.get(product.id);
    if (existingSelectionId) {
      // Deselect: clicking a selected product removes it
      removeSelection(existingSelectionId);
    } else {
      const placement = generateDefaultPlacement(product);
      addSelection(product, placement);
    }
  };

  return (
    <div className="h-full flex flex-col bg-lx-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-subtitle mb-1">Curated Collection</p>
        <h3 className="font-editorial-medium text-lx-charcoal text-[1.375rem]">
          {formatCategoryName(activeCategory)}
        </h3>
        <p className="text-caption mt-2">
          {products.length} product{products.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="divider mx-6" />

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                isSelected={selectionByProductId.has(product.id)}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        </AnimatePresence>

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-[1px] bg-lx-linen mb-6" />
            <p className="text-body text-lx-warm-gray text-center">
              No products in this category
              <br />
              for your room type
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  index,
  isSelected,
  onClick,
}: {
  product: Product;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{
        duration: 0.4,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className={`product-card-luxury group rounded-[var(--lx-radius-lg)] overflow-hidden ${
        isSelected ? "ring-1 ring-lx-accent" : ""
      }`}
    >
      {/* Placeholder: blank with text (no product images) */}
      <div className="aspect-square bg-lx-linen relative overflow-hidden mb-2.5 flex items-center justify-center rounded-[var(--lx-radius-md)]">
        <span className="text-center font-editorial text-lx-sand text-[0.75rem] px-2 leading-tight line-clamp-3">
          {product.name}
        </span>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-lx-black/0 group-hover:bg-lx-black/5 transition-colors duration-400" />

        {/* Selected indicator */}
        {isSelected && (
          <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-[var(--lx-radius-sm)] bg-lx-accent flex items-center justify-center"
          >
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}

        {/* Price tag */}
        <div className="absolute bottom-2 left-2 bg-lx-white/90 backdrop-blur-sm px-2 py-0.5 rounded-[var(--lx-radius-sm)]">
          <span className="text-[0.625rem] font-sans font-medium text-lx-charcoal tracking-wide">
            ${product.price.toLocaleString()}
            {["countertops", "backsplash", "flooring"].includes(product.category)
              ? "/sf"
              : ""}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-0.5">
        <p className="text-[0.6875rem] font-sans font-normal text-lx-charcoal leading-tight truncate">
          {product.name}
        </p>
        <p className="text-[0.5625rem] font-sans text-lx-warm-gray mt-0.5 tracking-wide uppercase">
          {product.brand}
        </p>
      </div>
    </motion.div>
  );
}

function generateDefaultPlacement(product: Product) {
  // Normalized (0–1) positions relative to the room image; scale = fraction of draw width
  const defaults: Record<string, { x: number; y: number; scale: number; rotation: number; z_order: number; shadow_plane: "floor" | "wall" | "countertop" | "ceiling" }> = {
    faucets: { x: 0.5, y: 0.36, scale: 0.12, rotation: 0, z_order: 5, shadow_plane: "countertop" },
    sinks: { x: 0.5, y: 0.42, scale: 0.18, rotation: 0, z_order: 4, shadow_plane: "countertop" },
    countertops: { x: 0.5, y: 0.45, scale: 1.0, rotation: 0, z_order: 2, shadow_plane: "floor" },
    cabinets: { x: 0.5, y: 0.55, scale: 1.0, rotation: 0, z_order: 1, shadow_plane: "wall" },
    backsplash: { x: 0.5, y: 0.28, scale: 1.0, rotation: 0, z_order: 1, shadow_plane: "wall" },
    flooring: { x: 0.5, y: 0.75, scale: 1.0, rotation: 0, z_order: 0, shadow_plane: "floor" },
    lighting: { x: 0.5, y: 0.12, scale: 0.1, rotation: 0, z_order: 8, shadow_plane: "ceiling" },
    mirrors: { x: 0.5, y: 0.25, scale: 0.2, rotation: 0, z_order: 6, shadow_plane: "wall" },
    hardware: { x: 0.45, y: 0.4, scale: 0.06, rotation: 0, z_order: 7, shadow_plane: "wall" },
    appliances: { x: 0.35, y: 0.5, scale: 0.22, rotation: 0, z_order: 3, shadow_plane: "floor" },
    fixtures: { x: 0.5, y: 0.4, scale: 0.15, rotation: 0, z_order: 5, shadow_plane: "floor" },
    shower: { x: 0.5, y: 0.3, scale: 0.14, rotation: 0, z_order: 4, shadow_plane: "wall" },
    tub: { x: 0.5, y: 0.5, scale: 0.28, rotation: 0, z_order: 3, shadow_plane: "floor" },
    vanity: { x: 0.5, y: 0.45, scale: 0.25, rotation: 0, z_order: 3, shadow_plane: "floor" },
    toilet: { x: 0.35, y: 0.55, scale: 0.12, rotation: 0, z_order: 3, shadow_plane: "floor" },
    walls: { x: 0.5, y: 0.3, scale: 1.0, rotation: 0, z_order: 0, shadow_plane: "wall" },
    islands: { x: 0.5, y: 0.55, scale: 0.3, rotation: 0, z_order: 3, shadow_plane: "floor" },
    storage: { x: 0.4, y: 0.45, scale: 0.15, rotation: 0, z_order: 5, shadow_plane: "wall" },
    windows: { x: 0.5, y: 0.2, scale: 0.2, rotation: 0, z_order: 4, shadow_plane: "wall" },
    doors: { x: 0.15, y: 0.4, scale: 0.25, rotation: 0, z_order: 3, shadow_plane: "wall" },
  };

  return defaults[product.category] || defaults.faucets;
}

function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    faucets: "Faucets & Fixtures",
    sinks: "Sinks",
    countertops: "Countertops",
    cabinets: "Cabinetry",
    backsplash: "Backsplash",
    flooring: "Flooring",
    lighting: "Lighting",
    mirrors: "Mirrors",
    hardware: "Hardware",
    appliances: "Appliances",
    fixtures: "Fixtures",
    shower: "Shower Systems",
    tub: "Bathtubs",
    vanity: "Vanities",
    toilet: "Toilets",
    walls: "Walls & Paint",
    islands: "Kitchen Islands",
    storage: "Storage Solutions",
    windows: "Window Treatments",
    doors: "Doors",
  };
  return names[category] || category;
}
