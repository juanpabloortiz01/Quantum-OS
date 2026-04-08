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
  
  console.log("[WEBHOOK_INGESTOR]: ─────────────────────────────────")
  console.log(`[WEBHOOK_INGESTOR]: event="${event}" | instance="${instance}"`)
  console.log("[WEBHOOK_INGESTOR]: payload_keys=", Object.keys(rawPayload ?? {}))
  console.log("[WEBHOOK_INGESTOR]: data_keys=", Object.keys(rawPayload?.data ?? {}))
  console.log("[WEBHOOK_INGESTOR]: message_keys=", Object.keys(rawPayload?.data?.message ?? {}))

  // Aceptar todos los formatos de evento que manda EvolutionAPI v2
  const isMessageEvent = [
    "messages.upsert",
    "MESSAGES_UPSERT",
    "message",
    "MESSAGE",
  ].includes(event)

  if (!isMessageEvent) {
    console.log(`[WEBHOOK_INGESTOR]: IGNORED event="${event}"`)
    return NextResponse.json({ status: "IGNORED", event }, { status: 200 })
  }

  // ── CRÍTICO: En Next.js standalone, el proceso no debe terminar antes  
  // que el pipeline complete. Usamos await con catch para contener errores.
  // La respuesta 200 ya fue enviada — EvolutionAPI no espera más.
  try {
    const result = await runPipeline(rawPayload)
    console.log("[WEBHOOK_INGESTOR]: pipeline_result=", JSON.stringify(result))
  } catch (err: any) {
    console.error("[WEBHOOK_UNHANDLED_ERROR]:", err?.message ?? err)
  }

  return NextResponse.json({ status: "RECEIVED" }, { status: 200 })
}

// GET para health check y verificación de la URL del webhook
export async function GET() {
  return NextResponse.json({
    status: "ONLINE",
    node: "QUANTUM_WEBHOOK_INGESTOR",
    protocol: "v1.0",
    timestamp: new Date().toISOString(),
  })
}

