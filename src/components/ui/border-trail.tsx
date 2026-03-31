"use client"

import { cn } from "@/lib/utils"
import { motion, Transition } from "motion/react"

interface BorderTrailProps {
  className?: string
  size?: number
  transition?: Transition
  delay?: number
  onAnimationComplete?: () => void
  style?: React.CSSProperties
}

const BASE_TRANSITION = {
  repeat: Infinity,
  duration: 4,
  ease: "linear" as const,
}

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]">
      <motion.div
        className={cn(
          "absolute aspect-square bg-zinc-500",
          className
        )}
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
  )
}