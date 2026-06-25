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
 * Envía un mensaje de ubicación por EvolutionAPI.
 */
async function sendLocation(
  evoUrl: string,
  instanceName: string,
  token: string,
  to: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number
): Promise<void> {
  const res = await fetch(`${evoUrl}/message/sendLocation/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: token,
    },
    body: JSON.stringify({
      number: to,
      name,
      address,
      latitude,
      longitude,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => res.statusText)
    throw new Error(`EVO_SEND_LOCATION_ERROR [${res.status}]: ${errBody}`)
  }
}

function getEcuadorWeekday(date: Date): string {
  // Ajustar la fecha a la zona horaria de Ecuador (GMT-5) de forma matemática
  const ecuadorDate = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  const dayIndex = ecuadorDate.getUTCDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
  
  const map = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
  return map[dayIndex] || "LU";
}

function isBusinessOpenOnDay(weekday: string, ctx: LoadedContext): boolean {
  if (ctx.scheduleType === "24h" || ctx.scheduleType === "custom") {
    if (ctx.scheduleConfig && ctx.scheduleConfig[weekday]) {
      return ctx.scheduleConfig[weekday].isOpen;
    }
    return false;
  }
  return Array.isArray(ctx.scheduleDays) && ctx.scheduleDays.includes(weekday);
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
      const urls = coreResult.imageUrls && coreResult.imageUrls.length > 0 ? coreResult.imageUrls : [coreResult.imageUrl];
      console.log(`[DISPATCHER]: Payload Media -> IMAGENES (${urls.length}) + CAPTION (${coreResult.cleanText?.length ?? 0} chars)`)
      
      // Enviar la primera imagen con el texto descriptivo
      await sendMedia(
        EVO_URL,
        instanceName,
        authKey,
        targetNumber,
        urls[0],
        coreResult.cleanText
      )

      // Enviar el resto de las imágenes secuencialmente sin caption
      for (let i = 1; i < urls.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800))
        await sendMedia(
          EVO_URL,
          instanceName,
          authKey,
          targetNumber,
          urls[i],
          ""
        )
      }
      return { success: true, method: "sendMedia" }
    } else if (coreResult.enviarUbicacion && ctx.locationConfig?.hasPhysicalLocation) {
      console.log(`[DISPATCHER]: Payload Location -> Lat: ${ctx.locationConfig.lat}, Lng: ${ctx.locationConfig.lng}`)
      
      // Enviar texto si hay
      if (coreResult.cleanText) {
        await sendText(EVO_URL, instanceName, authKey, targetNumber, coreResult.cleanText)
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      await sendLocation(
        EVO_URL,
        instanceName,
        authKey,
        targetNumber,
        ctx.companyName,
        ctx.locationConfig.address || "Dirección del local",
        ctx.locationConfig.lat,
        ctx.locationConfig.lng
      )

      return { success: true, method: "sendLocation" as any }
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

      // ── MANEJO DE RESERVA DE MESAS EXCEDIDA (ESCALADO DIRECTO) ──────────────
      if (coreResult.reservaExcedeLimite) {
        const { cliente_nombre, cantidad_personas, fecha_hora_deseada, pedido } = coreResult.reservaExcedeLimite

        let fechaHora: Date
        const isoBase = fecha_hora_deseada
          .replace(/Z$/, "")
          .replace(/[+-]\d{2}:\d{2}$/, "")
          .match(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/)?.[0] ?? fecha_hora_deseada.substring(0, 16)
        fechaHora = new Date(`${isoBase}-05:00`)

        const cleanPhone = to.replace("@s.whatsapp.net", "")

        try {
          await prisma.reserva.create({
            data: {
              organizationId: ctx.organizationId,
              cliente_id: cleanPhone,
              cliente_nombre,
              cantidad_personas,
              fecha_hora_deseada: fechaHora,
              estado: "pendiente_aprobacion",
              pedido
            }
          })
          console.log(`[DISPATCHER]: Reserva EXCEDIDA registrada como pendiente de aprobación.`)
        } catch (dbErr: any) {
          console.error(`[DISPATCHER_RESERVAS_EXCEDE_ERROR]:`, dbErr.message)
        }

        if (ctx.notifPhone) {
          const rawDigits = ctx.notifPhone.replace(/\D/g, "")
          const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
          const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`

          const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit", hour12: true })
          const formatDate = (d: Date) => d.toLocaleDateString("es-EC", { timeZone: "America/Guayaquil", weekday: "long", day: "numeric", month: "long" })

          const notifMsg = [
            `🔔 *NUEVA RESERVA PENDIENTE DE APROBACIÓN (GRUPO GRANDE)*`,
            ``,
            `👤 *Cliente:* ${cliente_nombre}`,
            `👥 *Personas:* ${cantidad_personas} (Supera la capacidad configurada)`,
            `🗓 *Fecha:* ${formatDate(fechaHora)}`,
            `⏰ *Hora:* ${formatTime(fechaHora)}`,
            `📱 *Teléfono:* ${cleanPhone}`,
            ...(pedido ? [`---`, `🍽 *Detalle del Pedido:*`, ...pedido.split('\n').map((p: string) => `- ${p.trim().replace(/^- /g, "")}`)] : []),
            ``,
            `_Por favor, contactate con el cliente y coordina la reservación de forma manual._`
          ].join("\n")

          try {
            await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
          } catch (err: any) {}
        }
      }

      // ── MANEJO DE RESERVA DE MESAS (RESERVACIONES) ──────────────────────
      if (coreResult.solicitarReserva) {
        const { cliente_nombre, cantidad_personas, fecha_hora_deseada, pedido } = coreResult.solicitarReserva

        let fechaHora: Date
        // La LLM genera la hora en tiempo local de Ecuador (GMT-5).
        // Limpiamos posibles sufijos de zona horaria en el string (ej. -05:00, Z) y los 
        // reemplazamos con el offset correcto de Ecuador para que Date() lo interprete bien.
        const isoBase = fecha_hora_deseada
          .replace(/Z$/, "")                // quitar Z
          .replace(/[+-]\d{2}:\d{2}$/, "") // quitar cualquier offset existente
          .match(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/) // tomar solo YYYY-MM-DDTHH:MM
          ?.[0] ?? fecha_hora_deseada.substring(0, 16)

        // Construir con offset Ecuador explícito: así Date() hace la conversión UTC correctamente
        // sin riesgo de overflow por suma manual de horas
        fechaHora = new Date(`${isoBase}-05:00`)

        const reqWeekday = getEcuadorWeekday(fechaHora)
        const isOpen = isBusinessOpenOnDay(reqWeekday, ctx)

        if (!isOpen) {
          const dayNamesMap: Record<string, string> = {
            LU: "Lunes",
            MA: "Martes",
            MI: "Miércoles",
            JU: "Jueves",
            VI: "Viernes",
            SA: "Sábado",
            DO: "Domingo"
          }

          let scheduleStr = "No especificado"
          if (ctx.scheduleType === "24h") {
            const activeDays = Object.entries(ctx.scheduleConfig || {})
              .filter(([_, config]) => config.isOpen)
              .map(([day, _]) => dayNamesMap[day] || day)
            scheduleStr = activeDays.length > 0
              ? `Abierto las 24 horas los días: ${activeDays.join(", ")}`
              : "Cerrado todos los días"
          } else if (ctx.scheduleType === "custom") {
            const customDays = Object.entries(ctx.scheduleConfig || {})
              .filter(([_, config]) => config.isOpen)
              .map(([day, config]) => `${dayNamesMap[day] || day} (de ${config.openTime} a ${config.closeTime})`)
            scheduleStr = customDays.length > 0
              ? `Horario de atención:\n${customDays.map(d => `- ${d}`).join("\n")}`
              : "Cerrado todos los días"
          } else {
            const mappedDays = (ctx.scheduleDays || []).map(day => dayNamesMap[day] || day)
            scheduleStr =
              (ctx.scheduleDays || []).length > 0
                ? `${mappedDays.join(", ")} de ${ctx.openTime} a ${ctx.closeTime}`
                : "No especificado"
          }

          const dayNameSpanish = dayNamesMap[reqWeekday] || reqWeekday
          const replyMessage = [
            `Lo sentimos, los días ${dayNameSpanish} no abrimos/trabajamos. 😔`,
            ``,
            `Nuestro horario de atención es:`,
            scheduleStr,
            ``,
            `Por favor, elige otra fecha para tu reservación.`
          ].join("\n")

          coreResult.cleanText = replyMessage
          console.log(`[DISPATCHER]: Reserva rechazada automáticamente por ser un día no laborable (${dayNameSpanish})`)
          
          await sendText(EVO_URL, instanceName, authKey, targetNumber, coreResult.cleanText)
          return { success: true, method: "sendText" }
        }

        try {
          console.log(`[DISPATCHER]: >>> PROCESANDO SOLICITUD DE RESERVA <<<`)
          const cleanPhone = to.replace("@s.whatsapp.net", "")

          // 1. Buscar si ya existe una propuesta de reagendamiento para este cliente
          const existingReagendado = await prisma.reserva.findFirst({
            where: {
              organizationId: ctx.organizationId,
              cliente_id: cleanPhone,
              estado: "reagendado"
            },
            orderBy: { updatedAt: "desc" }
          })

          let reservaToUpdateId: string | null = null
          if (existingReagendado && existingReagendado.propuesta_alternativa) {
            const reqDateStr = fechaHora.toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
            const origDateStr = existingReagendado.fecha_hora_deseada.toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })
            const propDateStr = existingReagendado.propuesta_alternativa.toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" })

            if (reqDateStr === origDateStr || reqDateStr === propDateStr) {
              reservaToUpdateId = existingReagendado.id
              // Forzar a usar la hora alternativa propuesta por el administrador
              fechaHora = existingReagendado.propuesta_alternativa
            }
          }

          const formatTime = (d: Date) => d.toLocaleTimeString("en-US", {
            timeZone: "America/Guayaquil",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          })
          const formatDate = (d: Date) => d.toLocaleDateString("es-EC", {
            timeZone: "America/Guayaquil",
            weekday: "long",
            day: "numeric",
            month: "long"
          })
          const horaStr = formatTime(fechaHora)
          const dateStr = formatDate(fechaHora)

          let estado = "confirmado"
          let replyMessage = ""

          if (reservaToUpdateId) {
            // Caso: Confirmación de propuesta de reagendamiento existente
            estado = "confirmado"
            replyMessage = [
              `¡Reserva Confirmada! 🎉`,
              ``,
              `Hola ${cliente_nombre}, tu mesa ha sido reservada con éxito para el nuevo horario:`,
              `👥 *Personas:* ${cantidad_personas}`,
              `🗓 *Fecha:* ${dateStr}`,
              `⏰ *Hora:* ${horaStr}`,
              ``,
              `¡Te esperamos!`
            ].join("\n")

            await prisma.reserva.update({
              where: { id: reservaToUpdateId },
              data: {
                fecha_hora_deseada: fechaHora,
                estado,
                propuesta_alternativa: null,
                pedido: pedido || undefined
              }
            })
            console.log(`[DISPATCHER]: Reserva existente ${reservaToUpdateId} REAGENDADA Y CONFIRMADA`)
          } else {
            // Caso Normal: Crear nueva reserva
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

            const maxPeoplePerHour = ctx.reservationsConfig?.tope_personas_por_hora ?? 25

            // Nueva lógica: x (solicitadas) + y (ya reservadas) vs tope
            if ((totalConfirmed + cantidad_personas) < maxPeoplePerHour) {
              estado = "confirmado"
              replyMessage = [
                `¡Reserva Confirmada! 🎉`,
                ``,
                `Hola ${cliente_nombre}, tu mesa ha sido reservada con éxito:`,
                `👥 *Personas:* ${cantidad_personas}`,
                `🗓 *Fecha:* ${dateStr}`,
                `⏰ *Hora:* ${horaStr}`,
                ``,
                `¡Te esperamos!`
              ].join("\n")
            } else {
              estado = "pendiente_aprobacion"
              replyMessage = `Lo siento, ese horario está muy saturado. El encargado te propondrá un horario alternativo disponible en breve.`
            }

            await prisma.reserva.create({
              data: {
                organizationId: ctx.organizationId,
                cliente_id: cleanPhone,
                cliente_nombre,
                cantidad_personas,
                fecha_hora_deseada: fechaHora,
                estado,
                pedido
              }
            })
          }

          if (estado === "confirmado") {
            try {
              await createAppointment(ctx.organizationId, {
                customerName: cliente_nombre,
                customerPhone: cleanPhone,
                service: "Reserva de Mesa",
                startTime: fechaHora,
                summary: `Reserva: ${cliente_nombre} - ${cantidad_personas} personas`
              })
              console.log(`[DISPATCHER]: Reserva agregada a Google Calendar para ${cliente_nombre}`)
            } catch (calErr: any) {
              console.warn(`[DISPATCHER_CALENDAR_WARN]: No se pudo registrar en Google Calendar:`, calErr.message)
            }
          }

          coreResult.cleanText = replyMessage

          if (ctx.notifPhone) {
            const rawDigits = ctx.notifPhone.replace(/\D/g, "")
            const noLeadingZero = rawDigits.startsWith("0") ? rawDigits.slice(1) : rawDigits
            const normalizedPhone = noLeadingZero.startsWith("593") ? noLeadingZero : `593${noLeadingZero}`

            if (estado === "pendiente_aprobacion") {
              const notifMsg = [
                `🔔 *NUEVA RESERVA PENDIENTE DE APROBACIÓN*`,
                ``,
                `👤 *Cliente:* ${cliente_nombre}`,
                `👥 *Personas:* ${cantidad_personas}`,
                `🗓 *Fecha:* ${dateStr}`,
                `⏰ *Hora:* ${horaStr}`,
                `📱 *Teléfono:* ${cleanPhone}`,
                ...(pedido ? [
                  `---`,
                  `🍽 *Detalle del Pedido:*`,
                  ...pedido.split('\n').map(p => `- ${p.trim().replace(/^- /g, "")}`)
                ] : []),
                ``,
                `_Por favor, ingresa al Dashboard de Reservaciones para aprobar o proponer una hora alternativa._`
              ].join("\n")

              try {
                await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
                console.log(`[DISPATCHER]: Alerta de reserva pendiente enviada a despachador ${normalizedPhone}`)
              } catch (notifErr: any) {
                console.error(`[DISPATCHER_RESERVA_NOTIF_ERROR]:`, notifErr.message)
              }
            } else if (estado === "confirmado") {
              const notifMsg = [
                `✅ *NUEVA RESERVA CONFIRMADA AUTOMÁTICAMENTE*`,
                ``,
                `👤 *Cliente:* ${cliente_nombre}`,
                `👥 *Personas:* ${cantidad_personas}`,
                `🗓 *Fecha:* ${dateStr}`,
                `⏰ *Hora:* ${horaStr}`,
                `📱 *Teléfono:* ${cleanPhone}`,
                ...(pedido ? [
                  `---`,
                  `🍽 *Detalle del Pedido:*`,
                  ...pedido.split('\n').map(p => `- ${p.trim().replace(/^- /g, "")}`)
                ] : []),
                ``,
                `_Esta reserva fue confirmada de forma autónoma por el agente._`
              ].join("\n")

              try {
                await sendText(EVO_URL, instanceName, authKey, normalizedPhone, notifMsg)
                console.log(`[DISPATCHER]: Alerta de reserva confirmada enviada a despachador ${normalizedPhone}`)
              } catch (notifErr: any) {
                console.error(`[DISPATCHER_RESERVA_NOTIF_ERROR]:`, notifErr.message)
              }
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
          `🍽 *Detalle del Pedido:* ${pedido?.plato || "No especificado"}`,
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
