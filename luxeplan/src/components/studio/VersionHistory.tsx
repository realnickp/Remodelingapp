"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";

export default function VersionHistory() {
  const versions = useProjectStore((s) => s.versions);
  const currentVersionId = useProjectStore((s) => s.currentVersionId);
  const loadVersion = useProjectStore((s) => s.loadVersion);

  if (versions.length === 0) return null;

  return (
    <div className="px-6 py-4 border-t border-lx-linen">
      <p className="text-subtitle mb-3">Version History</p>
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence>
          {versions.map((version) => (
            <motion.button
              key={version.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => loadVersion(version.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 transition-all duration-300 ${
                currentVersionId === version.id
                  ? "bg-lx-cream"
                  : "hover:bg-lx-ivory"
              }`}
            >
              <div className="w-12 h-8 bg-lx-linen flex items-center justify-center">
                <span className="font-editorial text-lx-stone text-[0.625rem]">
                  v{version.version_number}
                </span>
              </div>
              <span className="text-[0.5625rem] text-lx-warm-gray">
                {version.selections.length} items
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
