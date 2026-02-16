"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useProjectStore } from "@/store/useProjectStore";
import type { DesignStyle } from "@/types";
import { STYLES, getStyleImagePath } from "@/lib/style-specs";

export default function StyleStep() {
  const setSelectedStyle = useProjectStore((s) => s.setSelectedStyle);
  const setOnboardingStep = useProjectStore((s) => s.setOnboardingStep);

  const handleSelect = (styleId: DesignStyle) => {
    setSelectedStyle(styleId);
    setOnboardingStep("layout");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[720px] mx-auto"
    >
      <div className="text-center mb-10">
        <p className="text-subtitle mb-3">Step 2 of 4</p>
        <h2 className="font-editorial-medium text-lx-charcoal text-[1.75rem] mb-2">
          Choose your style
        </h2>
        <p className="text-body max-w-[360px] mx-auto">
          This helps us surface the most relevant products and generate photorealistic concept images.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STYLES.map((style, i) => (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(style.id as DesignStyle)}
            className="group border border-lx-linen hover:border-lx-sand bg-lx-white transition-colors duration-300 text-left cursor-pointer overflow-hidden rounded-[var(--lx-radius-xl)]"
          >
            <div className="relative w-full aspect-[16/10] overflow-hidden">
              <Image
                src={getStyleImagePath(style)}
                alt={`${style.title} style`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 flex gap-1">
                {style.palette.map((color, ci) => (
                  <div
                    key={ci}
                    className="w-5 h-5 rounded-full border-2 border-white/80 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-editorial-medium text-lx-charcoal text-[1rem] mb-1">
                {style.title}
              </h3>
              <p className="text-[0.625rem] font-sans text-lx-warm-gray leading-relaxed">
                {style.description}
              </p>
              <div className="w-4 h-[1px] bg-lx-sand group-hover:w-8 group-hover:bg-lx-accent transition-all duration-300 mt-3" />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => setOnboardingStep("room-type")}
          className="text-caption hover:text-lx-charcoal transition-colors duration-300 cursor-pointer"
        >
          Back
        </button>
      </div>
    </motion.div>
  );
}
