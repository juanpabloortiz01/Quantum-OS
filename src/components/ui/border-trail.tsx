"use client";
import { cn } from "@/lib/utils";
import { motion, Transition, Easing } from "motion/react";

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

const BASE_TRANSITION: {
  repeat: number;
  duration: number;
  ease: Easing;
} = {
  repeat: Infinity,
  duration: 5,
  ease: "linear",
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-[#00FFFF]", className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        } as Transition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}