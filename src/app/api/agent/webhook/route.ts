/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 1: WEBHOOK INGESTOR
 *  El Receptor. Punto de entrada único.
 *  POST /api/agent/webhook
 * ─────────────────────────────────────────────────
 */

import { NextResponse } from "next/server"
import { runPipeline } from "@/lib/agent/pipeline"

// Forzar runtime Node.js — necesario para que el pipeline async  
// no sea cancelado al retornar la respuesta en modo edge/standalone
export const runtime = "nodejs"
export const maxDuration = 60 // segundos máximos para el pipeline

// Este endpoint es público — lo llama EvolutionAPI directamente
export async function POST(req: Request) {
  let rawPayload: any

  try {
    rawPayload = await req.json()
  } catch {
    return NextResponse.json(
      { status: "PARSE_ERROR", message: "Payload JSON inválido." },
      { status: 400 }
    )
  }

  // ── DEBUG: Log completo de la estructura del payload ──────────────
  // Esto nos permite ver exactamente qué manda EvolutionAPI
  const event = rawPayload?.event ?? rawPayload?.type ?? "unknown"
  const instance = rawPayload?.instance ?? rawPayload?.data?.instance ?? "?"

  console.log(`[WEBHOOK_INGESTOR]: >>> NUEVO EVENTO RECIBIDO: "${event}" <<<`)
  console.log(`[WEBHOOK_INGESTOR]: Instancia Source: "${instance}"`)
  console.log("[WEBHOOK_INGESTOR]: Payload Completo:", JSON.stringify(rawPayload, null, 2))

  // Aceptar todos los formatos de evento que manda EvolutionAPI v2
  const isMessageEvent = [
    "messages.upsert",
    "MESSAGES_UPSERT",
    "message",
    "MESSAGE",
  ].includes(event)

  if (!isMessageEvent) {
    console.log(`[WEBHOOK_INGESTOR]: IGNORED event="${event}" (No es un upsert de mensaje)`)
    return NextResponse.json({ status: "IGNORED", event }, { status: 200 })
  }

  // ── CRÍTICO: Ejecución del Pipeline ────────────────────────────────
  console.log(`[WEBHOOK_INGESTOR]: Disparando Pipeline para instancia "${instance}"...`)

  try {
    const result = await runPipeline(rawPayload)
    console.log(`[WEBHOOK_INGESTOR]: Pipeline Finalizado [${result.status}] result=`, JSON.stringify(result))
  } catch (err: any) {
    console.error("[WEBHOOK_CRITICAL_ERROR]: Fallo fatal en runPipeline:", err?.message ?? err)
    if (err.stack) console.error(err.stack)
  }

  return NextResponse.json({ status: "RECEIVED", instance }, { status: 200 })
}

// GET para check de conectividad interna desde el VPS
export async function GET() {
  const EVO_URL = process.env.EVOLUTION_URL ?? process.env.EVOLUTION_API_URL ?? ""
  let evoHealth = "UNKNOWN"
  let errorDetail = null

  if (EVO_URL) {
    try {
      // Intentar un fetch rápido al root de la API interna
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      const res = await fetch(EVO_URL, { signal: controller.signal as any })
      clearTimeout(timeout)
      evoHealth = res.ok ? "REACHABLE" : `ERROR_${res.status}`
    } catch (err: any) {
      evoHealth = "UNREACHABLE"
      errorDetail = err?.message ?? "Connect Timeout / DNS Error"
    }
  }

  return NextResponse.json({
    status: "ONLINE",
    node: "QUANTUM_WEBHOOK_INGESTOR",
    timestamp: new Date().toISOString(),
    diagnostics: {
      internal_evo_url: EVO_URL,
      internal_evo_status: evoHealth,
      error_detail: errorDetail,
      environment: process.env.NODE_ENV
    }
  })
}

