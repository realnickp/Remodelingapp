"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { SEED_PRODUCTS } from "@/lib/products";
import LuxeLogo from "@/components/LuxeLogo";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import RoomTypeStep from "@/components/onboarding/RoomTypeStep";
import StyleStep from "@/components/onboarding/StyleStep";
import LayoutStep from "@/components/onboarding/LayoutStep";
import UploadStep from "@/components/onboarding/UploadStep";

export default function OnboardingPage() {
  const onboardingStep = useProjectStore((s) => s.onboardingStep);
  const uploadStep = useProjectStore((s) => s.uploadStep);
  const setProducts = useProjectStore((s) => s.setProducts);
  const router = useRouter();

  useEffect(() => {
    setProducts(SEED_PRODUCTS);
  }, [setProducts]);

  useEffect(() => {
    if (uploadStep === "ready") {
      const timer = setTimeout(() => {
        router.push("/studio");
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [uploadStep, router]);

  return (
    <main className="min-h-screen flex flex-col bg-lx-white overflow-x-hidden">
      {/* Header */}
      <nav className="flex items-center justify-between px-4 md:px-10 py-4 md:py-6 pt-[env(safe-area-inset-top)]">
        <LuxeLogo size="large" />
        <OnboardingProgress currentStep={onboardingStep} />
      </nav>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-10 py-6 md:py-8 min-w-0">
        <AnimatePresence mode="wait">
          {onboardingStep === "room-type" && <RoomTypeStep key="room-type" />}
          {onboardingStep === "style" && <StyleStep key="style" />}
          {onboardingStep === "layout" && <LayoutStep key="layout" />}
          {onboardingStep === "upload" && <UploadStep key="upload" />}
        </AnimatePresence>
      </div>
    </main>
  );
}
