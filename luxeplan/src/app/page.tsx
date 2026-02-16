"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useProjectStore } from "@/store/useProjectStore";
import { SEED_PRODUCTS } from "@/lib/products";
import LuxeLogo from "@/components/LuxeLogo";
import FadeIn from "@/components/FadeIn";
import Link from "next/link";

export default function Home() {
  const setProducts = useProjectStore((s) => s.setProducts);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setProducts(SEED_PRODUCTS);
  }, [setProducts]);

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key="landing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="min-h-screen flex flex-col bg-lx-white"
      >
        {/* Navigation */}
        <nav className="flex items-center justify-between px-4 md:px-10 py-4 md:py-6 pt-[env(safe-area-inset-top)]">
          <LuxeLogo size="large" />
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <span className="text-caption hover:text-lx-charcoal cursor-pointer transition-colors duration-300">
              Portfolio
            </span>
            <span className="text-caption hover:text-lx-charcoal cursor-pointer transition-colors duration-300">
              How It Works
            </span>
            <button className="btn-secondary text-[0.625rem] px-5 py-2 min-h-[44px] flex items-center">
              Sign In
            </button>
          </div>
          {/* Mobile: hamburger */}
          <button
            type="button"
            onClick={() => setNavOpen((o) => !o)}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-lx-charcoal"
            aria-label="Open menu"
          >
            {navOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {navOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30 bg-black/40 md:hidden"
                onClick={() => setNavOpen(false)}
                aria-hidden
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                className="fixed top-0 right-0 z-40 w-[min(280px,85vw)] h-full bg-lx-white shadow-xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:hidden"
              >
                <div className="flex flex-col gap-1 p-4">
                  <button
                    type="button"
                    onClick={() => setNavOpen(false)}
                    className="min-h-[44px] flex items-center text-left text-caption hover:text-lx-charcoal transition-colors"
                  >
                    Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavOpen(false)}
                    className="min-h-[44px] flex items-center text-left text-caption hover:text-lx-charcoal transition-colors"
                  >
                    How It Works
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] flex items-center btn-secondary text-[0.625rem] px-5 py-2 mt-2 w-fit"
                  >
                    Sign In
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Hero — image first, then copy (no duplicate logo) */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 lg:px-10">
          <div className="max-w-[1680px] w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left (desktop): large hero image — main focus */}
            <div className="w-full lg:flex-[1.15] lg:min-w-0 order-2 lg:order-1">
              <FadeIn delay={0.15} direction="none">
                <div className="w-full relative">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-lx-linen shadow-xl">
                    <Image
                      src="/images/hero-before-after.png"
                      alt="Bathroom remodel — before and after"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 65vw"
                      priority
                    />
                  </div>
                  <p className="mt-3 text-center font-editorial text-lx-sand text-[0.9375rem]">
                    Your space, reimagined
                  </p>
                </div>
              </FadeIn>
            </div>

            {/* Right (desktop): headline + CTA — no logo */}
            <div className="w-full lg:flex-[0.85] lg:max-w-[420px] order-1 lg:order-2 flex flex-col justify-center">
              <FadeIn delay={0.2}>
                <p className="text-subtitle mb-4">
                  AI-Powered Design Studio
                </p>
              </FadeIn>
              <FadeIn delay={0.25}>
                <h1 className="text-display text-lx-black mb-6">
                  Reimagine
                  <br />
                  Your Space
                </h1>
              </FadeIn>
              <FadeIn delay={0.35}>
                <div className="divider-accent mb-6" />
              </FadeIn>
              <FadeIn delay={0.4}>
                <p className="text-body text-lx-charcoal mb-8">
                  Upload a photo of your kitchen or bathroom. Select from
                  curated luxury products. Watch your vision materialize with
                  photorealistic precision.
                </p>
              </FadeIn>
              <FadeIn delay={0.5}>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-3 bg-lx-charcoal text-lx-white px-10 py-4 min-h-[44px] text-[0.75rem] font-sans tracking-[0.15em] uppercase hover:bg-lx-black transition-colors duration-300 w-fit"
                >
                  Start Designing
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </FadeIn>
              <FadeIn delay={0.6}>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6">
                  <span className="flex items-center gap-2 text-caption">
                    <span className="w-1 h-1 rounded-full bg-lx-accent" />
                    One-click placement
                  </span>
                  <span className="flex items-center gap-2 text-caption">
                    <span className="w-1 h-1 rounded-full bg-lx-accent" />
                    Instant budgets
                  </span>
                  <span className="flex items-center gap-2 text-caption">
                    <span className="w-1 h-1 rounded-full bg-lx-accent" />
                    AI compositing
                  </span>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>

        {/* Footer accent */}
        <div className="px-4 md:px-10 py-6 md:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-caption text-center md:text-left">
            Trusted by architects and interior designers worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 md:gap-8">
            {["Architectural Digest", "Elle Decor", "Dwell"].map((pub) => (
              <span
                key={pub}
                className="font-editorial text-lx-sand text-[0.8125rem] tracking-wide"
              >
                {pub}
              </span>
            ))}
          </div>
        </div>
      </motion.main>
    </AnimatePresence>
  );
}
