"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion } from "motion/react"

interface TitoMascotProps {
  className?: string
}

export default function TitoMascot({ className = "" }: TitoMascotProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Offset del ojo completo (el óvalo entero se mueve)
  const [leftOffset, setLeftOffset]   = useState({ x: 0, y: 0 })
  const [rightOffset, setRightOffset] = useState({ x: 0, y: 0 })

  // Estado de parpadeo/guiño: ry del óvalo (18 = abierto, 1 = cerrado)
  const [eyeRy, setEyeRy] = useState({ left: 18, right: 18 })

  // Centros de reposo de cada ojo en el viewBox 0 0 200 200
  const L0 = { cx: 78, cy: 113 }
  const R0 = { cx: 122, cy: 113 }
  const MAX_MOVE = 6 // px máx que el óvalo puede desplazarse

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    if (rect.width === 0) return

    // Posición del cursor en coordenadas del viewBox (0–200)
    const svgX = ((e.clientX - rect.left)  / rect.width)  * 200
    const svgY = ((e.clientY - rect.top)   / rect.height) * 200

    const calcOffset = (base: { cx: number; cy: number }) => {
      const dx   = svgX - base.cx
      const dy   = svgY - base.cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) return { x: 0, y: 0 }
      const factor = Math.min(dist / 160, 1)
      return {
        x: (dx / dist) * MAX_MOVE * factor,
        y: (dy / dist) * MAX_MOVE * factor,
      }
    }

    setLeftOffset(calcOffset(L0))
    setRightOffset(calcOffset(R0))
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  // Parpadeo / guiño periódico
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    const schedule = () => {
      t = setTimeout(() => {
        const rand = Math.random()

        if (rand < 0.25) {
          // Guiño izquierdo
          setEyeRy({ left: 1, right: 18 })
          setTimeout(() => setEyeRy({ left: 18, right: 18 }), 300)
        } else if (rand < 0.4) {
          // Guiño derecho
          setEyeRy({ left: 18, right: 1 })
          setTimeout(() => setEyeRy({ left: 18, right: 18 }), 300)
        } else {
          // Parpadeo completo
          setEyeRy({ left: 1, right: 1 })
          setTimeout(() => setEyeRy({ left: 18, right: 18 }), 140)
        }

        schedule()
      }, 2400 + Math.random() * 3800)
    }

    schedule()
    return () => clearTimeout(t)
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── CUERPO ── */}
      <circle cx="100" cy="118" r="75" fill="#F54927" />

      {/* Brillo sutil en la parte superior */}
      <ellipse cx="85" cy="82" rx="30" ry="18" fill="white" opacity="0.13" />

      {/* ── ARCO DEL HEADSET ── */}
      <path
        d="M 28 102 Q 100 25 172 102"
        stroke="#1A1A1A"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── AURICULAR IZQUIERDO ── */}
      <rect x="14" y="92" width="24" height="32" rx="7" fill="#1A1A1A" />

      {/* ── AURICULAR DERECHO ── */}
      <rect x="162" y="92" width="24" height="32" rx="7" fill="#1A1A1A" />

      {/* ── BRAZO DEL MICRÓFONO ── */}
      <path
        d="M 28 124 Q 30 152 56 158"
        stroke="#1A1A1A"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Cápsula del micrófono */}
      <rect x="48" y="153" width="19" height="10" rx="5" fill="#1A1A1A" />

      {/* ── OJO IZQUIERDO (el óvalo completo se mueve) ── */}
      <motion.ellipse
        cx={L0.cx}
        cy={L0.cy}
        rx="13"
        fill="#1A1A1A"
        animate={{
          cx: L0.cx + leftOffset.x,
          cy: L0.cy + leftOffset.y,
          ry: eyeRy.left,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      />

      {/* ── OJO DERECHO (el óvalo completo se mueve) ── */}
      <motion.ellipse
        cx={R0.cx}
        cy={R0.cy}
        rx="13"
        fill="#1A1A1A"
        animate={{
          cx: R0.cx + rightOffset.x,
          cy: R0.cy + rightOffset.y,
          ry: eyeRy.right,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      />
    </svg>
  )
}
