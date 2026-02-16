"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";

export default function BudgetPanel() {
  const budget = useProjectStore((s) => s.budget);
  const selections = useProjectStore((s) => s.selections);
  const removeSelection = useProjectStore((s) => s.removeSelection);
  const zipCode = useProjectStore((s) => s.zipCode);
  const setZipCode = useProjectStore((s) => s.setZipCode);
  const styleRenderItems = useProjectStore((s) => s.styleRenderItems);
  const [isExpanded, setIsExpanded] = useState(false);

  // Show AI-estimated items when no manual selections yet
  const showAiEstimate = selections.length === 0 && styleRenderItems && styleRenderItems.length > 0;

  if (selections.length === 0 && !showAiEstimate) return null;

  // Compute AI estimate totals
  const aiTotal = styleRenderItems?.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0) ?? 0;
  const aiTotalLow = Math.round(aiTotal * 0.8);
  const aiTotalHigh = Math.round(aiTotal * 1.2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-lx-white border-t border-lx-linen"
    >
      {/* Collapsed: summary */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <p className="text-subtitle">
            {showAiEstimate ? "AI-Estimated Budget" : "Budget Estimate"}
          </p>
          <span className="text-[0.5rem] text-lx-warm-gray">
            {showAiEstimate
              ? `${styleRenderItems!.length} item${styleRenderItems!.length !== 1 ? "s" : ""}`
              : `${selections.length} item${selections.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-editorial-medium text-lx-charcoal text-[1.125rem]">
            {showAiEstimate
              ? `$${aiTotalLow.toLocaleString()} — $${aiTotalHigh.toLocaleString()}`
              : `$${budget.total_low.toLocaleString()} — $${budget.total_high.toLocaleString()}`}
          </p>
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-lx-stone"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </div>
      </button>

      {/* Expanded: line items */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5">
              {/* Zip code input (only for manual selections) */}
              {!showAiEstimate && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-caption">Zip code for labor rates:</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) =>
                        setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))
                      }
                      placeholder="Enter zip"
                      maxLength={5}
                      className="w-20 text-[0.75rem] font-sans text-lx-charcoal bg-lx-cream px-2.5 py-1.5 border-none outline-none placeholder:text-lx-sand"
                    />
                  </div>
                  <div className="divider mb-4" />
                </>
              )}

              {/* AI-estimated items */}
              {showAiEstimate && (
                <>
                  <p className="text-[0.625rem] text-lx-warm-gray uppercase tracking-wide mb-3">
                    AI-Estimated Materials
                  </p>
                  <div className="space-y-3">
                    {styleRenderItems!.map((item, i) => (
                      <motion.div
                        key={`${item.category}-${i}`}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.75rem] font-sans text-lx-charcoal truncate">
                            {item.name}
                          </p>
                          <p className="text-[0.625rem] text-lx-warm-gray uppercase tracking-wide">
                            {item.category}
                            {item.material ? ` — ${item.material}` : ""}
                            {item.finish ? ` / ${item.finish}` : ""}
                          </p>
                        </div>
                        {item.estimatedCost != null && (
                          <p className="text-[0.75rem] font-sans text-lx-charcoal">
                            ~${item.estimatedCost.toLocaleString()}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <div className="divider my-4" />

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[0.75rem] font-sans font-medium text-lx-charcoal">
                        Estimated Range
                      </span>
                      <span className="font-editorial-medium text-lx-charcoal text-[1rem]">
                        ${aiTotalLow.toLocaleString()} — ${aiTotalHigh.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[0.5625rem] text-lx-warm-gray">
                      Based on AI analysis. Add products for precise pricing.
                    </p>
                  </div>
                </>
              )}

              {/* Manual selection line items */}
              {!showAiEstimate && (
                <>
                  <div className="space-y-3">
                    {selections.map((selection) => {
                      const lineItem = budget.line_items.find(
                        (li) => li.product_name === selection.product.name
                      );
                      return (
                        <motion.div
                          key={selection.id}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.75rem] font-sans text-lx-charcoal truncate">
                              {selection.product.name}
                            </p>
                            <p className="text-[0.625rem] text-lx-warm-gray uppercase tracking-wide">
                              {selection.product.brand} — {selection.product.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[0.75rem] font-sans text-lx-charcoal">
                                ${selection.product.price.toLocaleString()}
                              </p>
                              {lineItem && (
                                <p className="text-[0.5625rem] text-lx-warm-gray">
                                  +${lineItem.labor_cost_low.toLocaleString()}–$
                                  {lineItem.labor_cost_high.toLocaleString()} labor
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSelection(selection.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-lx-cream"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 10 10"
                                fill="none"
                              >
                                <path
                                  d="M2 2L8 8M8 2L2 8"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  strokeLinecap="round"
                                  className="text-lx-warm-gray"
                                />
                              </svg>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="divider my-4" />

                  {/* Totals */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-caption">Materials</span>
                      <span className="text-[0.75rem] font-sans text-lx-charcoal">
                        $
                        {budget.line_items
                          .reduce((sum, li) => sum + li.material_cost, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption">
                        Labor{zipCode ? ` (${zipCode})` : ""}
                      </span>
                      <span className="text-[0.75rem] font-sans text-lx-charcoal">
                        ${budget.labor_estimate_low.toLocaleString()} — $
                        {budget.labor_estimate_high.toLocaleString()}
                      </span>
                    </div>
                    <div className="divider my-2" />
                    <div className="flex justify-between">
                      <span className="text-[0.75rem] font-sans font-medium text-lx-charcoal">
                        Total Estimate
                      </span>
                      <span className="font-editorial-medium text-lx-charcoal text-[1rem]">
                        ${budget.total_low.toLocaleString()} — $
                        {budget.total_high.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
