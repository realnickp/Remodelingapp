"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { useApplySelectionToImage } from "@/hooks/useApplySelectionToImage";
import type { Product } from "@/types";

export default function ProductShowroom() {
  const activeCategory = useProjectStore((s) => s.activeCategory);
  const filteredProducts = useProjectStore((s) => s.filteredProducts);
  const selections = useProjectStore((s) => s.selections);
  const addSelection = useProjectStore((s) => s.addSelection);
  const removeSelection = useProjectStore((s) => s.removeSelection);
  const { applyToImage, loading: applyLoading, canApply } = useApplySelectionToImage();

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
      {/* Header — on mobile: same line as category, small Apply button to the right */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 flex flex-col md:block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-subtitle mb-0.5 md:mb-1 text-[0.625rem] md:text-inherit">Curated Collection</p>
            <h3 className="font-editorial-medium text-lx-charcoal text-[1.125rem] md:text-[1.375rem]">
              {formatCategoryName(activeCategory)}
            </h3>
            <p className="text-caption mt-1 md:mt-2 text-[0.625rem] md:text-inherit">
              {products.length} product{products.length !== 1 ? "s" : ""} available
            </p>
          </div>
          {/* Mobile only: clean Apply button on same line as header */}
          {canApply && (
            <button
              type="button"
              onClick={applyToImage}
              disabled={applyLoading}
              className="md:hidden flex-shrink-0 text-[0.6875rem] font-sans text-lx-charcoal hover:text-lx-accent border border-lx-linen hover:border-lx-sand rounded-md px-2.5 py-1.5 min-h-[32px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applyLoading ? "Applying…" : "Apply to image"}
            </button>
          )}
        </div>
      </div>

      <div className="divider mx-4 md:mx-6" />

      {/* Product list: horizontal scroll on mobile (one card in view), grid on desktop */}
      <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4">
        <AnimatePresence mode="popLayout">
          {/* Mobile: horizontal scroll */}
          <div key="mobile-product-list" className="flex md:hidden gap-3 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((product, i) => (
              <ProductCard
                key={`mobile-${product.id}-${i}`}
                product={product}
                index={i}
                isSelected={selectionByProductId.has(product.id)}
                onClick={() => handleProductClick(product)}
                variant="mobile"
              />
            ))}
          </div>
          {/* Desktop: 2-column grid */}
          <div key="desktop-product-list" className="hidden md:grid grid-cols-2 gap-3">
            {products.map((product, i) => (
              <ProductCard
                key={`desktop-${product.id}-${i}`}
                product={product}
                index={i}
                isSelected={selectionByProductId.has(product.id)}
                onClick={() => handleProductClick(product)}
                variant="desktop"
                onApplyToImage={applyToImage}
                applyLoading={applyLoading}
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
  variant,
  onApplyToImage,
  applyLoading,
}: {
  product: Product;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  variant: "mobile" | "desktop";
  onApplyToImage?: () => void;
  applyLoading?: boolean;
}) {
  const isMobile = variant === "mobile";
  return (
    <motion.div
      layout={!isMobile}
      initial={{ opacity: 0, y: isMobile ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isMobile ? 0 : -12 }}
      transition={{
        duration: 0.4,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className={`product-card-luxury group rounded-[var(--lx-radius-lg)] overflow-hidden flex-shrink-0 ${
        isSelected ? "ring-1 ring-lx-accent" : ""
      } ${isMobile ? "w-[78vw] max-w-[300px] snap-center snap-always" : ""}`}
    >
      {/* Placeholder: blank with text (no product images); smaller on mobile */}
      <div className={`bg-lx-linen relative overflow-hidden flex items-center justify-center rounded-[var(--lx-radius-md)] ${
        isMobile ? "aspect-square mb-1.5 min-h-[140px]" : "aspect-square mb-2.5"
      }`}>
        <span className={`text-center font-editorial text-lx-sand leading-tight line-clamp-3 ${
          isMobile ? "text-[0.8125rem] px-2" : "text-[0.75rem] px-2"
        }`}>
          {product.name}
        </span>

        {/* Apply to image — pill on the image when selected (desktop only; mobile uses header button) */}
        {!isMobile && isSelected && onApplyToImage && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onApplyToImage(); }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={applyLoading}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black text-white text-[0.625rem] font-sans uppercase tracking-wider px-4 py-2 min-h-[28px] hover:bg-lx-charcoal disabled:opacity-60 disabled:cursor-not-allowed shadow-lg cursor-pointer"
          >
            {applyLoading ? "Applying…" : "Apply to image"}
          </button>
        )}

        {/* Hover overlay — desktop only */}
        {!isMobile && (
          <div className="absolute inset-0 bg-lx-black/0 group-hover:bg-lx-black/5 transition-colors duration-400" />
        )}

        {/* Selected indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute top-2 right-2 rounded-[var(--lx-radius-sm)] bg-lx-accent flex items-center justify-center ${
              isMobile ? "w-4 h-4" : "w-5 h-5"
            }`}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className={isMobile ? "w-2.5 h-2" : ""}>
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
        <div className={`absolute bottom-2 left-2 bg-lx-white/90 backdrop-blur-sm rounded-[var(--lx-radius-sm)] ${
          isMobile ? "px-1.5 py-0.5" : "px-2 py-0.5"
        }`}>
          <span className={`font-sans font-medium text-lx-charcoal tracking-wide ${
            isMobile ? "text-[0.5625rem]" : "text-[0.625rem]"
          }`}>
            ${product.price.toLocaleString()}
            {["countertops", "backsplash", "flooring"].includes(product.category)
              ? "/sf"
              : ""}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className={isMobile ? "px-0.5" : "px-0.5"}>
        <p className={`font-sans font-normal text-lx-charcoal leading-tight truncate ${
          isMobile ? "text-[0.625rem]" : "text-[0.6875rem]"
        }`}>
          {product.name}
        </p>
        <p className={`font-sans text-lx-warm-gray tracking-wide uppercase ${
          isMobile ? "text-[0.5rem] mt-0.5" : "text-[0.5625rem] mt-0.5"
        }`}>
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
