"use client";

import Image from "next/image";

type LogoSize = "default" | "large" | "hero";

const SIZE_CLASSES: Record<LogoSize, string> = {
  default: "h-10 w-auto",
  large: "h-12 sm:h-16 md:h-24 lg:h-28 w-auto",
  hero: "h-32 w-auto md:h-40",
};

export default function LuxeLogo({
  size = "default",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  const image = SIZE_CLASSES[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt="LuxePlan"
        width={80}
        height={36}
        className={`${image} object-contain object-left flex-shrink-0`}
        priority
      />
    </div>
  );
}
