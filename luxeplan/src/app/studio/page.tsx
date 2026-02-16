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

      {/* Main content — mobile: scroll to see products below; desktop: 50/50 */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-x-hidden overflow-y-auto md:overflow-y-hidden">
        {/* Left: first viewport on mobile (canvas + chat + bar); no overlap with products */}
        <div className="w-full min-h-[calc(100vh-8rem)] md:min-h-0 flex-1 flex flex-col min-w-0 relative shrink-0 md:flex-[5]">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <StudioCanvas />
            <RegionSelector />
          </div>
          <div className="flex-shrink-0 relative z-[25] bg-lx-white border-t border-lx-linen">
            <ChatPanel />
          </div>
          <div className="flex-shrink-0 z-20 bg-lx-white relative border-t border-lx-linen">
            <StudioBottomBar />
          </div>
        </div>

        {/* Right: below the fold on mobile (scroll to see); 50% on desktop */}
        <div className="w-full md:flex-[5] min-w-0 md:min-w-[280px] max-w-[480px] border-t md:border-t-0 md:border-l border-lx-linen flex flex-col min-h-[45vh] md:min-h-0 flex-none shrink-0 md:flex-[5]">
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
