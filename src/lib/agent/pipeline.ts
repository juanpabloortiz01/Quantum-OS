/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — PIPELINE ORCHESTRATOR
 *  El Protocolo. Secuencia los 6 nodos en orden.
 *  Cada fallo es contenido. El flujo nunca se rompe.
 * ─────────────────────────────────────────────────
 *
 *  [Webhook] → [Logic Filter] → [Sentry] → [Context Loader] → [Core] → [Dispatcher]
 */

import { applyLogicFilter, ParsedMessage } from "./logic-filter"
import { runSentry } from "./sentry"
import { loadContext } from "./context-loader"
import { runCore } from "./core"
import { handleOrderReceipt, runDispatcher } from "./dispatcher"
import { bufferMessage } from "./debouncer"
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
 * Retorna inmediatamente tras encolar el mensaje para evitar timeouts.
 */
export async function runPipeline(rawPayload: any): Promise<PipelineResult> {
  console.log("[PIPELINE]: Inicia NODO 2 (Logic Filter)")
  const filterResult = applyLogicFilter(rawPayload)

  // Manejo de mensajes de nosotros (Human Agent)
  if (!filterResult.valid && filterResult.reason === "SELF_MSG") {
    const msg = filterResult.parsed!
    const ctx = await prisma.organization.findFirst({
      where: { evolutionInstance: msg.instanceName }
    })
    if (ctx) {
      console.log(`[PIPELINE]: Registro de respuesta humana para JID: ${msg.remoteJid}`)
      await prisma.chatHistory.create({
        data: {
          organizationId: ctx.id,
          customerPhone: msg.remoteJid,
          role: "assistant",
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

  // Encolar/agrupar mensaje y retornar respuesta de éxito inmediatamente para liberar la conexión
  bufferMessage(msg, (combinedMsg) => {
    executePipeline(combinedMsg).catch((err) => {
      console.error("[PIPELINE_ASYNC_ERROR]: Error al procesar el pipeline en segundo plano:", err)
    })
  })

  return { status: "SUCCESS" }
}

/**
 * Ejecuta la parte principal del pipeline (Sentry, Context, Core, Dispatcher)
 * de forma asíncrona una vez que expira el tiempo del buffer de mensajes.
 */
export async function executePipeline(msg: ParsedMessage): Promise<PipelineResult> {
  console.log(`[PIPELINE]: Iniciando procesamiento asíncrono para JID: ${msg.remoteJid}`)

  // ── PRE-CHECK: Estado de Pausa (Terminal Tags) ─────────────────────
  const ctxBrief = await prisma.organization.findFirst({
    where: { evolutionInstance: msg.instanceName }
  })

  if (ctxBrief) {
    const lead = await prisma.lead.findUnique({
      where: {
        organizationId_customerPhone: {
          organizationId: ctxBrief.id,
          customerPhone: msg.remoteJid
        }
      }
    })

    if (lead && lead.agentActive === false) {
      console.log(`[PIPELINE]: Agente en pausa para ${msg.remoteJid} por desactivación manual o escalado previo.`)
      return { status: "FILTERED", reason: "AGENT_DISABLED" }
    }
  }

  // ── NODO 3 — The Sentry ──────────────────────────────────────────
  const sentryResult = await runSentry(msg.text ?? "", undefined)

  // ── NODO 4 — Context Loader ──────────────────────────────────────
  const ctx = await loadContext(msg.instanceName, sentryResult, msg.senderPhone)
  if (!ctx) {
    console.error(`[PIPELINE_ERROR]: No se pudo cargar el contexto para la instancia ${msg.instanceName}`)
    return { status: "NO_CONTEXT" }
  }

  // El comprobante en imagen es una señal de pago, no una consulta visual al modelo.
  if (msg.messageType === "image" && ctx.transferEnabled && ctx.transferDetails.trim()) {
    const pendingAssistant = await prisma.chatHistory.findFirst({
      where: {
        organizationId: ctx.organizationId,
        customerPhone: msg.remoteJid,
        role: "assistant",
        content: { contains: "PEDIDO_PENDIENTE_COMPROBANTE:" },
      },
      orderBy: { createdAt: "desc" },
    })
    const pendingMatch = pendingAssistant?.content.match(/PEDIDO_PENDIENTE_COMPROBANTE:(\{[^\n]+\})/i)
    if (pendingAssistant && pendingMatch) {
      try {
        const order = JSON.parse(pendingMatch[1])
        await handleOrderReceipt(msg.remoteJid, ctx, msg, order)
        await prisma.chatHistory.update({
          where: { id: pendingAssistant.id },
          data: { content: pendingAssistant.content.replace("PEDIDO_PENDIENTE_COMPROBANTE:", "PEDIDO_COMPROBANTE_RECIBIDO:") },
        })
        await prisma.chatHistory.createMany({
          data: [
            { organizationId: ctx.organizationId, customerPhone: msg.remoteJid, role: "user", content: "[COMPROBANTE_RECIBIDO: imagen]" },
            { organizationId: ctx.organizationId, customerPhone: msg.remoteJid, role: "assistant", content: "¡Gracias! Recibimos tu comprobante. Tu pedido ha sido confirmado y enviado a preparación." },
          ],
        })
        await prisma.lead.updateMany({
          where: { organizationId: ctx.organizationId, customerPhone: msg.remoteJid },
          data: { agentActive: false },
        })
        return { status: "SUCCESS", method: "sendMedia" }
      } catch (error: any) {
        console.error("[PIPELINE_RECEIPT_ERROR]:", error?.message ?? error)
        return { status: "DISPATCH_ERROR", reason: "No se pudo procesar el comprobante" }
      }
    }
  }

  // ── NODO 5 — The Core ────────────────────────────────────────────
  let coreResult
  try {
    coreResult = await runCore(msg, ctx, sentryResult)
  } catch (err: any) {
    console.error("[PIPELINE_ERROR]: Error en Nodo 5 (Core):", err?.message)
    return { status: "CORE_ERROR", reason: err?.message }
  }

  // ── NODO 6 — Response Dispatcher ────────────────────────────────
  const dispatchResult = await runDispatcher(msg.remoteJid, coreResult, ctx, msg)

  // ── NODO 7 — Lead / Conversation Tracking ───────────────────────
  try {
    const trustScore = sentryResult.confidence === "HIGH" ? 95 : sentryResult.confidence === "MED" ? 75 : 50
    const summaryText = coreResult?.summary || (msg.text ? (msg.text.length > 80 ? msg.text.substring(0, 80) + "..." : msg.text) : "Mensaje multimedia")
    const isEscalation = coreResult?.isEscaladoSoporte || coreResult?.reservaExcedeLimite || coreResult?.isPedidoConfirmado || coreResult?.agendarCita ? true : false
    const isRelevantIntent = ["SOPORTE", "AGENDAMIENTO", "CONSULTA_PRODUCTO"].includes(sentryResult.intent)

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
        intent: sentryResult.intent,
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
    })
  } catch (err: any) {
    console.error("[PIPELINE_LEAD_UPSERT_ERROR]:", err?.message ?? err)
  }

  console.log(`[PIPELINE]: Procesamiento asíncrono finalizado con éxito para JID: ${msg.remoteJid}`)
  return {
    status: dispatchResult.success ? "SUCCESS" : "DISPATCH_ERROR",
    method: dispatchResult.method,
    intent: sentryResult.intent,
    tokensUsed: coreResult.tokensUsed,
  }
}
