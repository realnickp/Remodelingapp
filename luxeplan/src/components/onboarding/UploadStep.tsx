"use client";

import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import PhotoUpload from "@/components/PhotoUpload";

export default function UploadStep() {
  const setOnboardingStep = useProjectStore((s) => s.setOnboardingStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[640px] mx-auto min-w-0 px-2 md:px-0"
    >
      <div className="text-center mb-10">
        <p className="text-subtitle mb-3">Step 4 of 4</p>
        <h2 className="font-editorial-medium text-lx-charcoal text-[1.75rem] mb-2">
          Upload your room photo
        </h2>
        <p className="text-body max-w-[400px] mx-auto">
          Take a straight-on photo of your room for the best results. We'll
          analyze surfaces, depth, and anchor points automatically.
        </p>
      </div>

      <PhotoUpload />

      <div className="text-center mt-6">
        <button
          onClick={() => setOnboardingStep("layout")}
          className="min-h-[44px] flex items-center justify-center mx-auto px-4 text-caption hover:text-lx-charcoal transition-colors duration-300 cursor-pointer"
        >
          Back
        </button>
      </div>
    </motion.div>
  );
}
