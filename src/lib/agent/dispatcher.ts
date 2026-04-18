/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 6: RESPONSE DISPATCHER
 *  El Despachador. Último nodo antes de WhatsApp.
 *  Decide qué enviar. Limpia. Dispara.
 * ─────────────────────────────────────────────────
 */

import { LoadedContext } from "./context-loader"
import { CoreResult } from "./core"
import { createAppointment } from "@/lib/calendar"


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
  const masterApiKey = process.env.EVOLUTION_API_KEY

  if (!instanceName) {
    return {
      success: false,
      method: "none",
      error: "Nombre de instancia no disponible.",
    }
  }

  // ── AUTH STRATEGY ──────────────────────────────────────────────────
  // Usamos el token de la instancia, pero si no existe, usamos la Master API Key.
  const authKey = token || masterApiKey || ""

  if (!authKey) {
    return { success: false, method: "none", error: "Sin credenciales de autenticación para Evolution API." }
  }

  // ── EVOLUTION v2 COMPATIBILITY ────────────────────────────────────
  const targetNumber = to // JID completo (number@s.whatsapp.net)
  console.log(`[DISPATCHER]: >>> ENVIANDO RESPUESTA <<<`)
  console.log(`[DISPATCHER]: Target: ${targetNumber} | Instancia: ${instanceName}`)
  console.log(`[DISPATCHER]: Endpoint: ${EVO_URL}/message/...`)
  console.log(`[DISPATCHER]: Usando AuthKey (masked): ${authKey.slice(0, 4)}...${authKey.slice(-4)}`)

  try {
    if (coreResult.hasImage && coreResult.imageUrl) {
      console.log(`[DISPATCHER]: Payload Media -> IMAGEN + CAPTION (${coreResult.cleanText?.length ?? 0} chars)`)
      await sendMedia(
        EVO_URL,
        instanceName,
        authKey,
        targetNumber,
        coreResult.imageUrl,
        coreResult.cleanText
      )
      return { success: true, method: "sendMedia" }
    } else {
      // ── EJECUTAR AGENDAMIENTO REAL ─────────────────────────────────
      if (coreResult.agendarCita) {
        let { service, date, time } = coreResult.agendarCita

        // Normalizar fecha si viene en formato DD/MM/YYYY
        if (date.includes("/")) {
          const parts = date.split("/")
          if (parts.length === 3) {
            // Asegurar que día y mes tengan 2 dígitos
            const day = parts[0].padStart(2, "0")
            const month = parts[1].padStart(2, "0")
            const year = parts[2]
            date = `${year}-${month}-${day}`
          }
        }

        // Crear fecha con el offset de Ecuador (GMT-5) explícito
        const startDate = new Date(`${date}T${time}:00-05:00`)




        try {
          console.log(`[DISPATCHER]: >>> AGENDANDO EVENTO EN CALENDAR <<<`)
          await createAppointment(ctx.organizationId, {
            customerName: coreResult.agendarCita.customerName || "Cliente WhatsApp",
            customerPhone: to,
            cedula: coreResult.agendarCita.cedula,
            service,
            startTime: startDate
          })

          console.log(`[DISPATCHER]: Evento creado con éxito para ${date} ${time}`)
        } catch (calErr: any) {
          console.error(`[DISPATCHER_CALENDAR_ERROR]:`, calErr.message)
        }
      }

      if (!coreResult.cleanText) {
        console.warn("[DISPATCHER_WARN]: No hay texto cargada en coreResult.")
        return { success: false, method: "none", error: "Respuesta vacía del Core." }
      }

      console.log(`[DISPATCHER]: Payload Text -> "${coreResult.cleanText.substring(0, 50)}..."`)
      await sendText(EVO_URL, instanceName, authKey, targetNumber, coreResult.cleanText)

      // ── NOTIFICACIÓN AL ENCARGADO DE PEDIDOS ─────────────────────
      // Solo para nicho VENTAS, cuando el pedido está confirmado y hay un número de notificación configurado
      if (
        coreResult.isPedidoConfirmado &&
        ctx.niche?.toUpperCase() === "VENTAS" &&
        ctx.notifPhone
      ) {
        const pedido = coreResult.pedidoData
        const notifMsg = [
          `🛒 *NUEVO PEDIDO — ${ctx.companyName}*`,
          ``,
          `🍽 *Plato:* ${pedido?.plato || "No especificado"}`,
          `👤 *Cliente:* ${pedido?.nombre || "No especificado"}`,
          `📍 *Dirección:* ${pedido?.direccion || "No especificada"}`,
          `📱 *WhatsApp:* ${to.replace("@s.whatsapp.net", "")}`,
          ``,
          `⏰ ${new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}`,
          `_Generado automáticamente por Quantum OS_`,
        ].join("\n")

        try {
          // Normalizar al formato internacional requerido por EvolutionAPI: 593XXXXXXXXX
          // Acepta: 968743698 | 0968743698 | +593968743698 | 593968743698
          const rawDigits = ctx.notifPhone.replace(/\D/g, "")       // quitar todo excepto dígitos
          const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
          const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`

          await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
          console.log(`[DISPATCHER]: Notificación enviada a ${normalizedPhone}`)
        } catch (notifErr: any) {
          console.error(`[DISPATCHER_NOTIF_ERROR]: No se pudo notificar al encargado:`, notifErr.message)
        }


      }

      return { success: true, method: "sendText" }
    }


  } catch (err: any) {
    console.error(`[DISPATCHER_FATAL]: Fallo en la conexión Fetch ->`, err?.message ?? err)
    return { success: false, method: "none", error: err?.message ?? "Error Fetch en Dispatcher." }
  }
}
