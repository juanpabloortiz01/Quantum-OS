/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 6: RESPONSE DISPATCHER
 *  El Despachador. Último nodo antes de WhatsApp.
 *  Decide qué enviar. Limpia. Dispara.
 * ─────────────────────────────────────────────────
 */

import { LoadedContext } from "./context-loader"
import { CoreResult } from "./core"

export interface DispatchResult {
  success: boolean
  method: "sendText" | "sendMedia" | "none"
  error?: string
}

/**
 * Envía un mensaje de texto simple por EvolutionAPI.
 */
async function sendText(
  evoUrl: string,
  instanceName: string,
  token: string,
  to: string,
  text: string
): Promise<void> {
  const res = await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: token,
    },
    body: JSON.stringify({
      number: to,
      text,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText)
    throw new Error(`EVO_SEND_TEXT_ERROR [${res.status}]: ${errBody}`)
  }
}

/**
 * Envía un mensaje con imagen (media) por EvolutionAPI.
 * La imagen puede ser una URL pública (Cloudinary, etc.).
 */
async function sendMedia(
  evoUrl: string,
  instanceName: string,
  token: string,
  to: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  const res = await fetch(`${evoUrl}/message/sendMedia/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: token,
    },
    body: JSON.stringify({
      number: to,
      mediatype: "image",
      mimetype: "image/jpeg",
      media: imageUrl,
      caption,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText)
    throw new Error(`EVO_SEND_MEDIA_ERROR [${res.status}]: ${errBody}`)
  }
}

/**
 * Despacha la respuesta generada por el Core a WhatsApp.
 * Decide el método según las etiquetas de control detectadas.
 */
export async function runDispatcher(
  to: string,
  coreResult: CoreResult,
  ctx: LoadedContext
): Promise<DispatchResult> {
  const EVO_URL =
    process.env.EVOLUTION_URL ?? process.env.EVOLUTION_API_URL ?? ""

  if (!EVO_URL) {
    return { success: false, method: "none", error: "EVOLUTION_URL no configurada." }
  }

  const instanceName = ctx.evolutionInstance
  const token = ctx.evolutionToken

  if (!instanceName || !token) {
    return {
      success: false,
      method: "none",
      error: "Instancia o token de Evolution no disponibles en el contexto.",
    }
  }

  // Normalizar número de teléfono (quitar el sufijo @s.whatsapp.net)
  const cleanNumber = to.replace("@s.whatsapp.net", "")

  try {
    if (coreResult.hasImage && coreResult.imageUrl) {
      // ── Ruta: Imagen + Caption ───────────────────────────────────
      await sendMedia(
        EVO_URL,
        instanceName,
        token,
        cleanNumber,
        coreResult.imageUrl,
        coreResult.cleanText
      )

      console.log(
        `[DISPATCHER]: sendMedia → ${cleanNumber} | instancia: ${instanceName}`
      )
      return { success: true, method: "sendMedia" }
    } else {
      // ── Ruta: Solo texto ─────────────────────────────────────────
      if (!coreResult.cleanText) {
        console.warn("[DISPATCHER_WARN]: Texto vacío, no se envía nada.")
        return { success: false, method: "none", error: "Respuesta vacía del Core." }
      }

      await sendText(EVO_URL, instanceName, token, cleanNumber, coreResult.cleanText)

      console.log(
        `[DISPATCHER]: sendText → ${cleanNumber} | instancia: ${instanceName}`
      )
      return { success: true, method: "sendText" }
    }
  } catch (err: any) {
    console.error("[DISPATCHER_ERROR]:", err?.message ?? err)
    return { success: false, method: "none", error: err?.message ?? "Error desconocido en el Dispatcher." }
  }
}
