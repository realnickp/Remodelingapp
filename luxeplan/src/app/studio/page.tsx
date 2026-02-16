"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { SEED_PRODUCTS } from "@/lib/products";
import StudioTopBar from "@/components/studio/StudioTopBar";
import StudioCanvas from "@/components/studio/StudioCanvas";
import ProductShowroom from "@/components/studio/ProductShowroom";
import CategoryBar from "@/components/studio/CategoryBar";
import BudgetPanel from "@/components/studio/BudgetPanel";
import VersionHistory from "@/components/studio/VersionHistory";
import ChatPanel from "@/components/studio/ChatPanel";
import RegionSelector from "@/components/studio/RegionSelector";
import StudioBottomBar from "@/components/studio/StudioBottomBar";

export default function StudioPage() {
  const project = useProjectStore((s) => s.project);
  const products = useProjectStore((s) => s.products);
  const setProducts = useProjectStore((s) => s.setProducts);
  // Ensure products are loaded
  useEffect(() => {
    if (products.length === 0) {
      setProducts(SEED_PRODUCTS);
    }
  }, [products.length, setProducts]);

  // If no project, set a demo project so studio works without uploading
  const setProject = useProjectStore((s) => s.setProject);
  useEffect(() => {
    if (!project) {
      setProject({
        id: "demo",
        name: "Demo Project",
        room_type: "kitchen",
        original_image_url: "/images/1.png",
        versions: [],
        current_version_id: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [project, setProject]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen flex flex-col bg-lx-white overflow-hidden"
    >
      {/* Top bar */}
      <StudioTopBar />

      {/* Category bar — at top, below nav */}
      <CategoryBar />

      {/* Main content — 50/50 on desktop; stack on mobile */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-x-hidden">
        {/* Left: Canvas — 50% on desktop; full width on mobile */}
        <div className="w-full md:flex-[5] min-w-0 relative flex flex-col min-h-[40vh] md:min-h-0">
          <div className="flex-1 min-h-0 relative">
            <StudioCanvas />
            <RegionSelector />
            <ChatPanel />
          </div>
          <StudioBottomBar />
        </div>

        {/* Right: Product showroom — 50% on desktop; full width below canvas on mobile */}
        <div className="w-full md:flex-[5] min-w-0 md:min-w-[280px] max-w-[480px] border-t md:border-t-0 md:border-l border-lx-linen flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ProductShowroom />
          </div>
          <VersionHistory />
          <BudgetPanel />
        </div>
      </div>
    </motion.div>
  );
}
