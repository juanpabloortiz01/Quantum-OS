/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — PIPELINE ORCHESTRATOR
 *  El Protocolo. Secuencia los 6 nodos en orden.
 *  Cada fallo es contenido. El flujo nunca se rompe.
 * ─────────────────────────────────────────────────
 *
 *  [Webhook] → [Logic Filter] → [Sentry] → [Context Loader] → [Core] → [Dispatcher]
 */

import { applyLogicFilter } from "./logic-filter"
import { runSentry } from "./sentry"
import { loadContext } from "./context-loader"
import { runCore } from "./core"
import { runDispatcher } from "./dispatcher"
import { debounceMessage } from "./debouncer"
import { prisma } from "@/lib/prisma"


export interface PipelineResult {
  status:
    | "FILTERED"
    | "NO_CONTEXT"
    | "CORE_ERROR"
    | "DISPATCH_ERROR"
    | "SUCCESS"
  method?: "sendText" | "sendMedia" | "none"
  reason?: string
  intent?: string
  tokensUsed?: number
}

/**
 * Ejecuta el pipeline completo sobre el payload crudo de EvolutionAPI.
 */
export async function runPipeline(rawPayload: any): Promise<PipelineResult> {
  const t0 = Date.now()

  // ─────────────────────────────────────────────
  //  NODO 2 — Logic Filter: El Centinela
  // ─────────────────────────────────────────────
  console.log("[PIPELINE]: Inicia NODO 2 (Logic Filter)")
  const filterResult = applyLogicFilter(rawPayload)

  // Manejo de mensajes de nosotros (Human Agent)
  if (!filterResult.valid && filterResult.reason === "SELF_MSG") {
    const msg = filterResult.parsed!
    // Intentar cargar contexto para saber la organización
    const ctx = await prisma.organization.findFirst({
        where: { evolutionInstance: msg.instanceName }
    })
    if (ctx) {
        console.log(`[PIPELINE]: Registro de respuesta humana para JID: ${msg.remoteJid}`)
        await prisma.chatHistory.create({
            data: {
                organizationId: ctx.id,
                customerPhone: msg.remoteJid,
                role: "assistant", // Los mensajes fromMe cuentan como assistant
                content: msg.text ?? "[multimedia/human]",
            }
        })
    }
    return { status: "FILTERED", reason: "SELF_MSG" }
  }

  if (!filterResult.valid) {
    console.log(`[PIPELINE]: >>> FILTERED <<< Razón: ${filterResult.reason}`)
    return { status: "FILTERED", reason: filterResult.reason ?? "Mensaje inválido." }
  }

  const msg = filterResult.parsed!

  // ─────────────────────────────────────────────
  //  PRE-CHECK: Estado de Pausa (Terminal Tags)
  //  Si la última respuesta fue un agendamiento o escalado,
  //  nos quedamos en silencio hasta que un humano intervenga.
  // ─────────────────────────────────────────────
  const ctxBrief = await prisma.organization.findFirst({
      where: { evolutionInstance: msg.instanceName }
  })

  if (ctxBrief) {
      // NUEVO: Verificamos si el switch desde el Dashboard desactivó el agente
      const lead = await prisma.lead.findUnique({
          where: {
              organizationId_customerPhone: {
                  organizationId: ctxBrief.id,
                  customerPhone: msg.remoteJid
              }
          }
      })

      if (lead && lead.agentActive === false) {
          console.log(`[PIPELINE]: Agente en pausa para ${msg.remoteJid} por desactivación manual desde Dashboard o escalado previo.`)
          return { status: "FILTERED", reason: "AGENT_DISABLED" }
      }
  }


  // ─────────────────────────────────────────────
  //  NODO 2.5 — DEBOUNCER
  // ─────────────────────────────────────────────
  if (msg.messageType === "text") {
    const combinedText = await debounceMessage(msg.remoteJid, msg.text ?? "", msg.messageType)
    msg.text = combinedText
  }

  // ─────────────────────────────────────────────
  //  NODO 3 — The Sentry
  // ─────────────────────────────────────────────
  const sentryResult = await runSentry(msg.text ?? "", undefined)

  // ─────────────────────────────────────────────
  //  NODO 4 — Context Loader
  // ─────────────────────────────────────────────
  const ctx = await loadContext(msg.instanceName, sentryResult)
  if (!ctx) return { status: "NO_CONTEXT" }

  // ─────────────────────────────────────────────
  //  NODO 5 — The Core
  // ─────────────────────────────────────────────
  let coreResult
  try {
    coreResult = await runCore(msg, ctx, sentryResult)
  } catch (err: any) {
    return { status: "CORE_ERROR", reason: err?.message }
  }

  // ─────────────────────────────────────────────
  //  NODO 6 — Response Dispatcher
  // ─────────────────────────────────────────────
  const dispatchResult = await runDispatcher(msg.remoteJid, coreResult, ctx)

  // ─────────────────────────────────────────────
  //  NODO 7 — Lead / Conversation Tracking
  // ─────────────────────────────────────────────
  try {
    const trustScore = sentryResult.confidence === "HIGH" ? 95 : sentryResult.confidence === "MED" ? 75 : 50;
    const summaryText = coreResult?.summary || (msg.text ? (msg.text.length > 80 ? msg.text.substring(0, 80) + "..." : msg.text) : "Mensaje multimedia");
    const isEscalation = coreResult?.isEscaladoSoporte || coreResult?.isPedidoConfirmado || coreResult?.agendarCita ? true : false;
    
    // Solo actualizamos la intención si es una de las 3 acciones principales pedidas por el usuario
    const isRelevantIntent = ["SOPORTE", "AGENDAMIENTO", "CONSULTA_PRODUCTO"].includes(sentryResult.intent);
    
    await prisma.lead.upsert({
      where: {
        organizationId_customerPhone: {
          organizationId: ctx.organizationId,
          customerPhone: msg.remoteJid
        }
      },
      create: {
        organizationId: ctx.organizationId,
        customerPhone: msg.remoteJid,
        name: coreResult?.userName || msg.pushName || "Desconocido",
        trustScore: trustScore,
        intent: sentryResult.intent, // Al crear, guardamos cualquiera
        summary: summaryText,
        agentActive: !isEscalation
      },
      update: {
        name: coreResult?.userName || msg.pushName || undefined,
        trustScore: trustScore,
        intent: isRelevantIntent ? sentryResult.intent : undefined,
        summary: summaryText,
        agentActive: isEscalation ? false : undefined
      }
    });
  } catch (err: any) {
    console.error("[PIPELINE_LEAD_UPSERT_ERROR]:", err?.message ?? err);
  }

  return {
    status: dispatchResult.success ? "SUCCESS" : "DISPATCH_ERROR",
    method: dispatchResult.method,
    intent: sentryResult.intent,
    tokensUsed: coreResult.tokensUsed,
  }
}

