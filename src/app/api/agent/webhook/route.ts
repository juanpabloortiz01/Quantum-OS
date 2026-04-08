/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 1: WEBHOOK INGESTOR
 *  El Receptor. Punto de entrada único.
 *  POST /api/agent/webhook
 * ─────────────────────────────────────────────────
 */

import { NextResponse } from "next/server"
import { runPipeline } from "@/lib/agent/pipeline"

// Este endpoint es público — lo llama EvolutionAPI directamente
export async function POST(req: Request) {
  let rawPayload: any

  try {
    rawPayload = await req.json()
  } catch {
    // Payload malformado — responder 400 para que EVO no reintente
    return NextResponse.json(
      { status: "PARSE_ERROR", message: "Payload JSON inválido." },
      { status: 400 }
    )
  }

  // Loguear solo el tipo de evento para debug sin exponer PII
  const event = rawPayload?.event ?? rawPayload?.type ?? "unknown"
  console.log(`[WEBHOOK_INGESTOR]: event=${event} | instance=${rawPayload?.instance ?? "?"}`)

  // Solo procesamos MESSAGES_UPSERT — ignorar silenciosamente el resto
  if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
    return NextResponse.json({ status: "IGNORED", event }, { status: 200 })
  }

  // Ejecutar el pipeline de forma no-bloqueante:
  // Respondemos 200 INMEDIATAMENTE a EvolutionAPI para evitar retries.
  // El pipeline corre en background.
  runPipeline(rawPayload).catch((err) => {
    console.error("[WEBHOOK_UNHANDLED_ERROR]:", err?.message ?? err)
  })

  return NextResponse.json({ status: "RECEIVED" }, { status: 200 })
}

// GET para health check del webhook
export async function GET() {
  return NextResponse.json({
    status: "ONLINE",
    node: "QUANTUM_WEBHOOK_INGESTOR",
    protocol: "v1.0",
    timestamp: new Date().toISOString(),
  })
}
