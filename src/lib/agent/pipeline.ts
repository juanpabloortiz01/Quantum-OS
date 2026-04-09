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
 * Nunca lanza excepción — retorna siempre un PipelineResult.
 */
export async function runPipeline(rawPayload: any): Promise<PipelineResult> {
  const t0 = Date.now()

  // ─────────────────────────────────────────────
  //  NODO 2 — Logic Filter: El Centinela
  // ─────────────────────────────────────────────
  console.log("[PIPELINE]: Inicia NODO 2 (Logic Filter)")
  const filterResult = applyLogicFilter(rawPayload)

  if (!filterResult.valid) {
    console.log(`[PIPELINE]: >>> FILTERED <<< Razón: ${filterResult.reason}`)
    return { status: "FILTERED", reason: filterResult.reason ?? "Mensaje inválido." }
  }

  const msg = filterResult.parsed!
  console.log(
    `[PIPELINE]: MSG_OK [${msg.messageType}] from ${msg.remoteJid} | instance: ${msg.instanceName}`
  )

  // ─────────────────────────────────────────────
  //  NODO 3 — The Sentry: El Clasificador
  // ─────────────────────────────────────────────
  console.log("[PIPELINE]: Inicia NODO 3 (Sentry)")
  const sentryResult = await runSentry(msg.text ?? "", undefined)
  console.log(
    `[SENTRY]: intent=${sentryResult.intent} | needs_inventory=${sentryResult.needs_inventory} | conf=${sentryResult.confidence}`
  )

  // ─────────────────────────────────────────────
  //  NODO 4 — Context Loader: El Bibliotecario
  // ─────────────────────────────────────────────
  console.log("[PIPELINE]: Inicia NODO 4 (Context Loader)")
  const ctx = await loadContext(msg.instanceName, sentryResult)

  if (!ctx) {
    console.error(`[PIPELINE]: >>> NO_CONTEXT <<< para instancia: ${msg.instanceName}`)
    return {
      status: "NO_CONTEXT",
      reason: `Instancia ${msg.instanceName} no vinculada a ninguna organización en la DB.`,
    }
  }

  console.log(
    `[CONTEXT]: org="${ctx.companyName}" | products=${ctx.products.length}`
  )

  // ─────────────────────────────────────────────
  //  NODO 5 — The Core: El Cerebro Multimodal
  // ─────────────────────────────────────────────
  console.log("[PIPELINE]: Inicia NODO 5 (Core)")
  let coreResult
  try {
    coreResult = await runCore(msg, ctx, sentryResult)
    console.log(
      `[CORE]: tokens=${coreResult.tokensUsed} | hasImage=${coreResult.hasImage} | pedido=${coreResult.isPedidoConfirmado}`
    )
  } catch (err: any) {
    console.error("[PIPELINE]: >>> CORE_ERROR <<<:", err?.message ?? err)
    return {
      status: "CORE_ERROR",
      reason: err?.message ?? "Fallo crítico en el Core.",
    }
  }

  // ─────────────────────────────────────────────
  //  NODO 6 — Response Dispatcher: El Despachador
  // ─────────────────────────────────────────────
  console.log("[PIPELINE]: Inicia NODO 6 (Dispatcher)")
  const dispatchResult = await runDispatcher(msg.remoteJid, coreResult, ctx)

  const elapsed = Date.now() - t0
  console.log(
    `[PIPELINE]: FINALIZADO | METHOD=${dispatchResult.method} | elapsed=${elapsed}ms | success=${dispatchResult.success}`
  )

  if (!dispatchResult.success) {
    console.error(`[PIPELINE]: >>> DISPATCH_ERROR <<<: ${dispatchResult.error}`)
    return {
      status: "DISPATCH_ERROR",
      method: dispatchResult.method,
      reason: dispatchResult.error,
      intent: sentryResult.intent,
      tokensUsed: coreResult.tokensUsed,
    }
  }

  return {
    status: "SUCCESS",
    method: dispatchResult.method,
    intent: sentryResult.intent,
    tokensUsed: coreResult.tokensUsed,
  }
}
