"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type BorderTrailProps = {
  className?: string;
  size?: number;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 8,
  delay = 0,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
      <motion.div
        className={cn(
          "absolute bg-[#00FFFF]",
          className
        )}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          filter: `blur(${size / 2}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ["0%", "100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          delay,
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, #00FFFF 10deg, transparent 20deg)",
          borderRadius: "inherit",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          delay,
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}