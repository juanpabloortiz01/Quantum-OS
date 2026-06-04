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
import { prisma } from "@/lib/prisma"


export interface DispatchResult {
  success: boolean
  method: "sendText" | "sendMedia" | "none"
  error?: string
}

/**
 * Envía un mensaje de texto simple por EvolutionAPI.
 */
export async function sendText(
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

      // ── MANEJO DE RESERVA DE MESAS (RESERVACIONES) ──────────────────────
      if (coreResult.solicitarReserva) {
        const { cliente_nombre, cantidad_personas, fecha_hora_deseada } = coreResult.solicitarReserva

        const cleanIsoStr = fecha_hora_deseada.includes("-") || fecha_hora_deseada.includes("+") 
          ? fecha_hora_deseada 
          : `${fecha_hora_deseada}-05:00`
        const fechaHora = new Date(cleanIsoStr)

        try {
          console.log(`[DISPATCHER]: >>> PROCESANDO SOLICITUD DE RESERVA <<<`)
          
          const startOfHour = new Date(fechaHora)
          startOfHour.setMinutes(0, 0, 0)
          const endOfHour = new Date(fechaHora)
          endOfHour.setMinutes(59, 59, 999)

          const confirmedReservations = await prisma.reserva.findMany({
            where: {
              organizationId: ctx.organizationId,
              estado: "confirmado",
              fecha_hora_deseada: {
                gte: startOfHour,
                lte: endOfHour
              }
            }
          })

          const totalConfirmed = confirmedReservations.reduce((sum: number, r: any) => sum + r.cantidad_personas, 0)

          const limitAutonomo = ctx.reservationsConfig?.limite_grupo_autonomo ?? 6
          const maxPeoplePerHour = ctx.reservationsConfig?.tope_personas_por_hora ?? 25

          const meetsLimitAutonomo = cantidad_personas <= limitAutonomo
          const meetsMaxPeople = (totalConfirmed + cantidad_personas) <= maxPeoplePerHour

          let estado = "confirmado"
          let replyMessage = ""

          const cleanPhone = to.replace("@s.whatsapp.net", "")

          const formatTime = (d: Date) => d.toLocaleTimeString("es-EC", {
            timeZone: "America/Guayaquil",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })
          const horaStr = formatTime(fechaHora)

          if (meetsLimitAutonomo && meetsMaxPeople) {
            estado = "confirmado"
            replyMessage = `Perfecto. Tu mesa está separada para hoy a las ${horaStr}. Te esperamos.`
          } else {
            estado = "pendiente_aprobacion"
            replyMessage = `Recibido. Al ser un grupo grande, el encargado está verificando la disposición de las mesas en este momento. Te confirmo en un par de minutos por aquí mismo.`
          }

          await prisma.reserva.create({
            data: {
              organizationId: ctx.organizationId,
              cliente_id: cleanPhone,
              cliente_nombre,
              cantidad_personas,
              fecha_hora_deseada: fechaHora,
              estado
            }
          })

          coreResult.cleanText = replyMessage

          if (estado === "pendiente_aprobacion" && ctx.notifPhone) {
            const notifMsg = [
              `🔔 *NUEVA RESERVA PENDIENTE DE APROBACIÓN*`,
              ``,
              `👤 *Cliente:* ${cliente_nombre}`,
              `👥 *Personas:* ${cantidad_personas}`,
              `⏰ *Hora:* ${horaStr}`,
              `📱 *Teléfono:* ${cleanPhone}`,
              ``,
              `_Por favor, ingresa al Dashboard de Reservaciones para aprobar o proponer una hora alternativa._`
            ].join("\n")

            try {
              const rawDigits = ctx.notifPhone.replace(/\D/g, "")
              const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
              const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`

              await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
              console.log(`[DISPATCHER]: Alerta de reserva pendiente enviada a despachador ${normalizedPhone}`)
            } catch (notifErr: any) {
              console.error(`[DISPATCHER_RESERVA_NOTIF_ERROR]:`, notifErr.message)
            }
          }

        } catch (dbErr: any) {
          console.error(`[DISPATCHER_RESERVAS_ERROR]:`, dbErr.message)
        }
      }

      if (!coreResult.cleanText) {
        console.warn("[DISPATCHER_WARN]: No hay texto cargada en coreResult.")
        return { success: false, method: "none", error: "Respuesta vacía del Core." }
      }

      console.log(`[DISPATCHER]: Payload Text -> "${coreResult.cleanText.substring(0, 50)}..."`)
      await sendText(EVO_URL, instanceName, authKey, targetNumber, coreResult.cleanText)

      // ── NOTIFICACIÓN AL ENCARGADO DE PEDIDOS (VENTAS) ────────────
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
          const rawDigits = ctx.notifPhone.replace(/\D/g, "")
          const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
          const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`
          await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
          console.log(`[DISPATCHER]: Notificación de pedido enviada a ${normalizedPhone}`)
        } catch (notifErr: any) {
          console.error(`[DISPATCHER_PEDIDO_NOTIF_ERROR]:`, notifErr.message)
        }
      }
      
      // ── NOTIFICACIÓN DE CITA AGENDADA (AGENDA) ───────────────────
      if (coreResult.agendarCita && ctx.notifPhone) {
        const cita = coreResult.agendarCita
        const notifMsg = [
          `📅 *NUEVA CITA AGENDADA — ${ctx.companyName}*`,
          ``,
          `👤 *Cliente:* ${cita.customerName || "No especificado"}`,
          `📝 *Servicio:* ${cita.service || "No especificado"}`,
          `🗓 *Fecha:* ${cita.date}`,
          `⏰ *Hora:* ${cita.time}`,
          `🆔 *Cédula:* ${cita.cedula || "No proporcionada"}`,
          `📱 *WhatsApp:* ${to.replace("@s.whatsapp.net", "")}`,
          ``,
          `⏰ ${new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}`,
          `_Generado automáticamente por Quantum OS_`,
        ].join("\n")

        try {
          const rawDigits = ctx.notifPhone.replace(/\D/g, "")
          const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
          const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`

          await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
          console.log(`[DISPATCHER]: Notificación de cita enviada a ${normalizedPhone}`)
        } catch (notifErr: any) {
          console.error(`[DISPATCHER_CITA_NOTIF_ERROR]:`, notifErr.message)
        }
      }
      
      // ── NOTIFICACIÓN DE ESCALADO A SOPORTE / ATENCIÓN HUMANA ─────
      if (coreResult.isEscaladoSoporte && ctx.notifPhone) {
        const nombre = coreResult.escalationData?.nombre || "No especificado"
        const notifMsg = [
          `📢 *ATENCIÓN HUMANA SOLICITADA — ${ctx.companyName}*`,
          ``,
          `👤 *Cliente:* ${nombre}`,
          `📱 *WhatsApp:* ${to.replace("@s.whatsapp.net", "")}`,
          `🔗 *Acción:* El cliente está esperando ser atendido.`,
          ``,
          `⏰ ${new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}`,
          `_Generado por Quantum OS_`,
        ].join("\n")

        try {
          const rawDigits = ctx.notifPhone.replace(/\D/g, "")
          const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
          const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`

          await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
          console.log(`[DISPATCHER]: Alerta de soporte enviada a ${normalizedPhone}`)
        } catch (notifErr: any) {
          console.error(`[DISPATCHER_SOPORTE_NOTIF_ERROR]:`, notifErr.message)
        }
      }

      return { success: true, method: "sendText" }
    }


  } catch (err: any) {
    console.error(`[DISPATCHER_FATAL]: Fallo en la conexión Fetch ->`, err?.message ?? err)
    return { success: false, method: "none", error: err?.message ?? "Error Fetch en Dispatcher." }
  }
}
