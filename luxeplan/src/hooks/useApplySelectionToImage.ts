"use client";

import { useState, useCallback } from "react";
import { useProjectStore } from "@/store/useProjectStore";

const CATEGORY_LABELS: Record<string, string> = {
  faucets: "Faucet", sinks: "Sink", countertops: "Countertop", cabinets: "Cabinet",
  backsplash: "Backsplash", flooring: "Floor", lighting: "Lighting", mirrors: "Mirror",
  hardware: "Hardware", appliances: "Appliance", shower: "Shower", tub: "Bathtub",
  vanity: "Vanity", toilet: "Toilet", walls: "Wall", islands: "Island", storage: "Storage",
  windows: "Window", doors: "Door", fixtures: "Fixture",
};

export function useApplySelectionToImage() {
  const project = useProjectStore((s) => s.project);
  const selections = useProjectStore((s) => s.selections);
  const activeCategory = useProjectStore((s) => s.activeCategory);
  const conceptImageUrl = useProjectStore((s) => s.conceptImageUrl);
  const detectedObjects = useProjectStore((s) => s.detectedObjects);
  const pushConceptImage = useProjectStore((s) => s.pushConceptImage);
  const setStudioMode = useProjectStore((s) => s.setStudioMode);

  const activeSelection = selections.find((s) => s.product.category === activeCategory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyToImage = useCallback(async () => {
    if (!project?.original_image_url || !activeSelection) return;
    setError(null);
    setLoading(true);
    try {
      const currentImageUrl = conceptImageUrl ?? project.original_image_url;
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
      const roomImageBase64 = await toBase64(currentImageUrl);
      const targetLabel = CATEGORY_LABELS[activeSelection.product.category] || activeSelection.product.category;
      const detail = [activeSelection.product.name];
      if (activeSelection.product.material) detail.push(activeSelection.product.material);
      if (activeSelection.product.finish) detail.push(activeSelection.product.finish);
      const prompt = `Replace the ${targetLabel.toLowerCase()} with: ${detail.join(", ")}.`;
      const objectInventory = detectedObjects.map((obj) => ({
        label: obj.label,
        category: obj.category,
        region: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
      }));
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImageBase64,
          prompt,
          detectedObjects: objectInventory.length ? objectInventory : undefined,
          targetCategory: activeSelection.product.category,
          targetLabel,
          targetProductName: activeSelection.product.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Apply failed");
        return;
      }
      if (data.imageBase64) {
        const dataUrl = `data:image/png;base64,${data.imageBase64}`;
        pushConceptImage(dataUrl);
        setStudioMode("concept");
      } else {
        setError("No image returned");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [project?.original_image_url, conceptImageUrl, activeSelection, detectedObjects, pushConceptImage, setStudioMode]);

  return { applyToImage, loading, error, activeSelection, canApply: !!(project?.original_image_url && activeSelection) };
}
