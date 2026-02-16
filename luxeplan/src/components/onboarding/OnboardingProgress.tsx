"use client";

import { motion } from "framer-motion";
import type { OnboardingStep } from "@/types";

const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: "room-type", label: "Room" },
  { key: "style", label: "Style" },
  { key: "layout", label: "Layout" },
  { key: "upload", label: "Photo" },
];

export default function OnboardingProgress({
  currentStep,
}: {
  currentStep: OnboardingStep;
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-3">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2">
                {isActive && (
                  <motion.div
                    layoutId="onboarding-dot"
                    className="absolute inset-0 rounded-full bg-lx-accent"
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                {!isActive && (
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      isComplete ? "bg-lx-accent/50" : "bg-lx-linen"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[0.625rem] font-sans tracking-widest uppercase transition-colors duration-300 ${
                  isActive
                    ? "text-lx-charcoal"
                    : isComplete
                    ? "text-lx-warm-gray"
                    : "text-lx-sand"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-[1px] transition-colors duration-300 ${
                  isComplete ? "bg-lx-accent/30" : "bg-lx-linen"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
