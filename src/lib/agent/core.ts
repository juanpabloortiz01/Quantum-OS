/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 5: THE CORE
 *  El Cerebro Multimodal. GPT-4o-mini.
 *  Razona. Compara. Vende. Recuerda.
 * ─────────────────────────────────────────────────
 */

import OpenAI from "openai"
import { prisma } from "@/lib/prisma"
import { LoadedContext } from "./context-loader"
import { SentryResult } from "./sentry"
import { ParsedMessage } from "./logic-filter"

const MAX_HISTORY = 10 // Últimos N mensajes a cargar

function formatToEcuadorTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const localStr = d.toLocaleString("en-US", { timeZone: "America/Guayaquil" });
    const localDate = new Date(localStr);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    const hours = String(localDate.getHours()).padStart(2, "0");
    const minutes = String(localDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    return isoStr;
  }
}

// ── Etiquetas de control internas ─────────────────────────────────
// El cliente NUNCA las ve. El Dispatcher las parsea.
// FOTO_URL:<url>          → enviar imagen
// PEDIDO_CONFIRMADO:      → marcar pedido como iniciado
// PAGO_SOLICITADO:        → enviar instrucciones de pago
// AGENDAR_CITA:           → crear cita en calendar
// ESCALADO_SOPORTE:       → notificar a recepción

function buildSystemPrompt(
  ctx: LoadedContext,
  sentryResult: SentryResult,
  isNewConversation: boolean,
  activeReserva?: any
): string {
  const ecuadorDateStr = new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" });
  const ecuadorDate = new Date(ecuadorDateStr);
  const year = ecuadorDate.getFullYear();
  const month = String(ecuadorDate.getMonth() + 1).padStart(2, "0");
  const day = String(ecuadorDate.getDate()).padStart(2, "0");
  const hours = String(ecuadorDate.getHours()).padStart(2, "0");
  const minutes = String(ecuadorDate.getMinutes()).padStart(2, "0");
  const seconds = String(ecuadorDate.getSeconds()).padStart(2, "0");
  const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const weekdayName = weekdays[ecuadorDate.getDay()];
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthName = months[ecuadorDate.getMonth()];

  // ── Horarios formateados ───────────────────────────────────────────
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
      ? `Horario de atención: ${customDays.join(", ")}`
      : "Cerrado todos los días"
  } else {
    // Compatibilidad con formato antiguo
    const mappedDays = ctx.scheduleDays.map(day => dayNamesMap[day] || day)
    scheduleStr =
      ctx.scheduleDays.length > 0
        ? `${mappedDays.join(", ")} de ${ctx.openTime} a ${ctx.closeTime}`
        : "No especificado"
  }

  // ── Catálogo de productos formateado ──────────────────────────────
  const catalogStr =
    ctx.products.length > 0
      ? ctx.products
          .filter(p => p.primaryColor !== "Menú" && p.category !== "MENÚ_COMPLETO" && p.category !== "SERVICIO") 
          .map((p, i) => {
            const hasDesc = p.characteristics && p.characteristics.trim().toLowerCase() !== "entrada manual"
            const parts = [
              `[Item ${i + 1}]`,
              p.category ? `Nombre: ${p.category}` : null,
              p.brand ? `Información/Precio: ${p.brand}` : null,
              hasDesc ? `Descripción: ${p.characteristics}` : null,
              p.imageUrl ? `Foto: ${p.imageUrl}` : null,
            ].filter(Boolean)
            return parts.join("\n")
          })
          .join("\n\n")
      : "No hay productos o servicios cargados en el sistema."


  // ── Información de contacto y redes ───────────────────────────────
  const contactParts = [
    ctx.address ? `Dirección: ${ctx.address}` : null,
    ctx.website ? `Web: ${ctx.website}` : null,
    ctx.instagram ? `Instagram: ${ctx.instagram}` : null,
    ctx.facebook ? `Facebook: ${ctx.facebook}` : null,
    ctx.contactEmail ? `Email: ${ctx.contactEmail}` : null,
    ctx.contactPhone ? `Teléfono adicional: ${ctx.contactPhone}` : null,
    ctx.shippingZones ? `Zonas de envío: ${ctx.shippingZones}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  // ── Identificar Menús/Servicios ──────────────────────────────────
  const menuProducts = ctx.products.filter(p => 
    p.category === "MENÚ_COMPLETO" || p.primaryColor === "Menú" || p.category === "SERVICIO"
  )
  const menuInfo = menuProducts.map(m => {
    const hasDesc = m.characteristics && m.characteristics.trim().toLowerCase() !== "entrada manual"
    const parts = [
      m.category ? `Nombre: ${m.category}` : null,
      m.brand ? `Precio/Valor: ${m.brand}` : null,
      hasDesc ? `Descripción: ${m.characteristics}` : null,
    ].filter(Boolean)
    return parts.join(" | ")
  }).join("\n")

  // ── Promociones / Lealtad ──────────────────────────────────────────
  let loyaltyStr = ""
  if (ctx.enabledNodes.includes("loyalty") && ctx.loyaltyRule) {
    const { triggerCount, triggerProduct, rewardCount, rewardProduct } = ctx.loyaltyRule as any
    loyaltyStr = `\n═══════════════════════════════════════
🎁 PROGRAMA DE PROMOCIONES (ACTIVO)
═══════════════════════════════════════
Ofrece y explica esta promoción a los clientes si preguntan por ofertas o si están finalizando un pedido:
- Por la compra de ${triggerCount} "${triggerProduct}", el cliente recibe ${rewardCount} "${rewardProduct}" completamente GRATIS.
`
  }

  // ── Reservaciones de Mesa ──────────────────────────────────────────
  let reservationsStr = ""
  if (ctx.enabledNodes.includes("reservations")) {
    reservationsStr = `\n═══════════════════════════════════════
📅 PROCESO DE RESERVACIONES DE MESAS (ACTIVO)
═══════════════════════════════════════
⚠️ REGLAS OBLIGATORIAS DE RESERVAS:
1. REGISTRO COMPLETO: No importa si es el mismo cliente o si ya se conoce su nombre de chats previos o del historial: SIEMPRE, para cada reservación, debes preguntar y confirmar de manera explícita las 3 cosas fundamentales antes de generar la etiqueta SOLICITAR_RESERVA:
   - El nombre completo de la persona que reserva (pídelo explícitamente para esta reserva).
   - La cantidad de personas.
   - La fecha y hora deseada para la reserva.
   No asumas ni omitas ninguno de estos 3 datos.

2. REGLA DE DÍAS NO LABORABLES: El horario de atención del local es: ${scheduleStr}. No debes proceder a realizar ninguna reservación para un día de la semana o fecha en la que el local no trabaje. Si el cliente quiere reservar en un día no laborable (ej: si el lunes no se trabaja y pide lunes), debes rechazar cordialmente la solicitud, explicarle que ese día no se labora, y enviarle los horarios de atención del local.

Solo cuando el cliente te haya proporcionado y confirmado explícitamente los 3 datos fundamentales Y la fecha solicitada sea en un día laborable del local, debes generar la siguiente etiqueta oculta al final de tu respuesta:
SOLICITAR_RESERVA:{"cliente_nombre": "Nombre del Cliente", "cantidad_personas": Número, "fecha_hora_deseada": "YYYY-MM-DDTHH:MM:SS"}

Nota: La fecha y hora debe estar en formato ISO YYYY-MM-DDTHH:MM:SS. Ajusta el año, mes y día de acuerdo a la fecha actual: ${year}-${month}-${day} y la hora actual: ${hours}:${minutes}.
`
  }

  let activeReservaStr = ""
  if (activeReserva) {
    const formatTime = (d: Date) => d.toLocaleTimeString("es-EC", {
      timeZone: "America/Guayaquil",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
    const formatDate = (d: Date) => d.toLocaleDateString("es-EC", {
      timeZone: "America/Guayaquil",
      weekday: "long",
      day: "numeric",
      month: "long"
    })

    const originalTime = formatTime(activeReserva.fecha_hora_deseada)
    const originalDate = formatDate(activeReserva.fecha_hora_deseada)

    if (activeReserva.estado === "reagendado" && activeReserva.propuesta_alternativa) {
      const altTime = formatTime(activeReserva.propuesta_alternativa)
      const altDate = formatDate(activeReserva.propuesta_alternativa)
      activeReservaStr = `\n═══════════════════════════════════════
⚠️ PROPUESTA DE REAGENDAMIENTO ACTIVA
═══════════════════════════════════════
El administrador propuso un nuevo horario para la reserva del cliente debido a falta de espacio:
- Horario Original: ${originalDate} a las ${originalTime}
- Nuevo Horario Propuesto: ${altDate} a las ${altTime}
- Cantidad de personas: ${activeReserva.cantidad_personas}

Si el cliente acepta esta nueva hora/fecha propuesta o expresa conformidad (ej: "sí", "está bien", "dale", "acepto", "perfecto"), DEBES confirmar la reserva en este nuevo horario y DEBES emitir OBLIGATORIAMENTE la etiqueta oculta al final de tu respuesta:
SOLICITAR_RESERVA:{"cliente_nombre": "${activeReserva.cliente_nombre}", "cantidad_personas": ${activeReserva.cantidad_personas}, "fecha_hora_deseada": "${activeReserva.propuesta_alternativa.toISOString().split('.')[0]}"}
`
    } else if (activeReserva.estado === "pendiente_aprobacion") {
      activeReservaStr = `\n═══════════════════════════════════════
⏳ SOLICITUD DE RESERVA PENDIENTE
═══════════════════════════════════════
El cliente tiene una solicitud de reserva pendiente de aprobación para el ${originalDate} a las ${originalTime} para ${activeReserva.cantidad_personas} personas.
Informa al cliente amablemente que el encargado del local está confirmando la disponibilidad de la mesa y en breve recibirá la confirmación. No tomes una nueva reserva a menos que el cliente indique cambiar los datos.
`
    }
  }

  const isAgenda = ctx.niche.toUpperCase() === "AGENDA";
  const hasReservations = ctx.enabledNodes.includes("reservations");

  const basePrompt = `Eres el asistente virtual experto de "${ctx.companyName}".
La fecha y hora actual en Ecuador (GMT-5) es: ${year}-${month}-${day} ${hours}:${minutes}:${seconds} (${weekdayName}, ${day} de ${monthName} de ${year}).`;

  const welcomeMenu = isAgenda ? `
"¡Hola! 👋 Bienvenido a *${ctx.companyName}*. ¿En qué puedo ayudarte hoy?

1️⃣ Hablar con alguien
2️⃣ Ver servicios
3️⃣ Información del local

Responde con el número de tu opción."` : (hasReservations ? `
"¡Hola! 👋 Bienvenido a *${ctx.companyName}*. ¿En qué puedo ayudarte hoy?

1️⃣ Hacer un pedido
2️⃣ Reservar una mesa
3️⃣ Hablar con alguien
4️⃣ Ver el menú / carta
5️⃣ Información del local

Responde con el número de tu opción."` : `
"¡Hola! 👋 Bienvenido a *${ctx.companyName}*. ¿En qué puedo ayudarte hoy?

1️⃣ Tomar un pedido
2️⃣ Hablar con alguien
3️⃣ Ver el menú / carta
4️⃣ Información del local

Responde con el número de tu opción."`);

  const escalationLogic = `
OPCIÓN ${isAgenda ? "1" : (hasReservations ? "3" : "2")} — HABLAR CON ALGUIEN:
1. Pregunta amablemente: "¿Con quién tengo el gusto? Así puedo avisar ahora mismo a la recepción para que te atienda personalmente."
2. Una vez que el cliente responda su nombre, emite la etiqueta EXACTA al final:
   ESCALADO_SOPORTE:{"nombre": "[nombre del cliente]"}
3. Responde al cliente: "Perfecto [nombre del cliente], acabo de avisar a la recepción. En breve se comunicarán contigo por este medio. ¡Gracias por tu paciencia! 🙏"`;

  const agendaRules = `
PROTOCOLO DE AGENDAMIENTO:
Solo cuando el cliente ha solicitado agendar y ha confirmado los 5 elements clave:
- SERVICIO, FECHA, HORA, NOMBRE COMPLETO y CÉDULA DE IDENTIDAD.
Si falta cualquiera de estos, pídela con amabilidad.

Cuando el cliente haya confirmado los 5 datos, tu respuesta DEBE incluir al final la etiqueta EXACTA:
AGENDAR_CITA:{"service": "Nombre del Servicio", "date": "YYYY-MM-DD", "time": "HH:MM", "customerName": "Nombre Apellido", "cedula": "1234567890"}

REGLAS DE DISPONIBILIDAD:
- Horario: ${scheduleStr}
- Ocupado actualmente:
${ctx.calendarAvailability && ctx.calendarAvailability.length > 0
    ? ctx.calendarAvailability.map(s => `- De ${formatToEcuadorTime(s.start)} a ${formatToEcuadorTime(s.end)}`).join("\n")
    : "Sin reservaciones previas."}
- Duración: 60 min por cita.`;

  const generalRules = hasReservations ? `
OPCIÓN 1 — HACER UN PEDIDO:
Sigue este protocolo de recolección:
1. ¿Qué plato(s) deseas pedir?
2. Nombre completo.
3. Dirección de entrega (si mandan ubicación por WhatsApp, trátala como dirección).
4. Resumen y confirmación: "Responde *CONFIRMAR* para finalizar."
Al confirmar el cliente, emite:
PEDIDO_CONFIRMADO:{"plato":"[plato]","nombre":"[nombre]","direccion":"[direccion]"}

OPCIÓN 2 — RESERVAR UNA MESA:
Sigue el protocolo de RESERVACIONES (pide Nombre, Personas, Fecha y Hora). Cuando tengas los 3 datos confirmados, genera la etiqueta SOLICITAR_RESERVA.` : `
OPCIÓN 1 — TOMAR UN PEDIDO:
Sigue este protocolo de recolección:
1. ¿Qué plato(s) deseas pedir?
2. Nombre completo.
3. Dirección de entrega (si mandan ubicación por WhatsApp, trátala como dirección).
4. Resumen y confirmación: "Responde *CONFIRMAR* para finalizar."
Al confirmar el cliente, emite:
PEDIDO_CONFIRMADO:{"plato":"[plato]","nombre":"[nombre]","direccion":"[direccion]"}`;

  return `${basePrompt}
Tu rol: ${isAgenda ? "Recepcionista y Gestor de Citas" : "Asistente de Ventas"}.

═══════════════════════════════════════
📋 MENÚ DE INICIO (BIENVENIDA)
═══════════════════════════════════════
Cuando un cliente saluda o escribe por primera vez, responde UNICAMENTE con:
${welcomeMenu}

═══════════════════════════════════════
🔄 PROTOCOLOS DE ACCIÓN
═══════════════════════════════════════
${isAgenda ? agendaRules : generalRules}

${escalationLogic}

OPCIÓN ${isAgenda ? "2" : (hasReservations ? "4" : "3")} — VER ${isAgenda ? "SERVICIOS" : "MENÚ"}:
${(ctx.niche?.toUpperCase() === "VENTAS" && ctx.menuImages && ctx.menuImages.length > 0)
  ? `Envía el menú al cliente de forma visual. Para ello, responde indicando una frase amable (ej: "Aquí tienes el menú de hoy:") y DEBES agregar obligatoriamente al final de tu respuesta una etiqueta FOTO_URL por cada una de las imágenes disponibles en esta lista exacta de URLs (emite una etiqueta FOTO_URL por línea en orden). IMPORTANTE: NO incluyas ninguna de estas URLs en el texto de tu respuesta (ej: no digas "puedes verlo en esta URL..."), ya que el sistema enviará la imagen directamente y el cliente la verá de forma visual. Limítate a usar la etiqueta FOTO_URL al final de tu mensaje:\n${ctx.menuImages.map(url => `FOTO_URL:${url}`).join("\n")}`
  : "Lista los productos/servicios disponibles de forma organizada."
}

OPCIÓN ${isAgenda ? "3" : (hasReservations ? "5" : "4")} — INFORMACIÓN:
Dirección: ${ctx.address || "No especificada"}
Horarios: ${scheduleStr}
${contactParts}
${loyaltyStr}
${reservationsStr}
${activeReservaStr}

═══════════════════════════════════════
CONOCIMIENTO BASE
═══════════════════════════════════════
${catalogStr}
${menuInfo ? `\nCATALOGO DETALLADO:\n${menuInfo}` : ""}

═══════════════════════════════════════
⚠️ REGLAS DE ORO (VERACIDAD Y CONTROL)
═══════════════════════════════════════
- VERACIDAD: Si el cliente pregunta algo que NO está en el CONOCIMIENTO BASE, di: "Lo lamento, no tengo esa información específica. Pero si gustas, puedo ponerte en contacto con la recepción para que te ayuden."
- ESCALADO: Si detectas frustración o peticiones repetidas de información que no conoces, usa el protocolo de ESCALADO_SOPORTE.
- BREVEDAD: Máximo 2 párrafos.
- ETIQUETAS ESTRUCTURALES:
  1. Si en este turno de la conversación descubres o ya sabes el nombre del usuario, incluye una etiqueta oculta en tu respuesta con este formato: [USER_NAME: Nombre del Usuario]. Si no lo sabes aún, no la incluyas.
  2. SIEMPRE debes incluir una etiqueta oculta al final de tu respuesta con un pequeñísimo resumen de la conversación actual, de máximo 5 palabras. Formato: [SUMMARY: Resumen aquí].
  3. Las demás etiquetas (AGENDAR_CITA:, ESCALADO_SOPORTE:, etc.) van siempre al FINAL de todo tu texto.

${isNewConversation ? `🚨 IMPORTANTE (PRIMERA VEZ): Como es el primer mensaje del cliente en el historial, debes darle una cordial bienvenida a *${ctx.companyName}* y preguntarle respetuosamente "¿Con quién tengo el gusto?" o similar. NO procedas con ninguna otra tarea ni ofrezcas menú o servicios hasta que el usuario te diga su nombre.` : ""}
`;
}

export interface CoreResult {
  rawResponse: string
  hasImage: boolean
  imageUrl: string | null
  imageUrls?: string[]
  isPedidoConfirmado: boolean
  pedidoData: { plato: string; nombre: string; direccion: string } | null
  isPagoSolicitado: boolean
  agendarCita: { service: string; date: string; time: string; customerName: string; cedula: string } | null
  isEscaladoSoporte: boolean
  escalationData: { nombre: string } | null
  solicitarReserva: { cliente_nombre: string; cantidad_personas: number; fecha_hora_deseada: string } | null

  userName: string | null
  summary: string | null

  cleanText: string
  tokensUsed: number
}

/**
 * El Cerebro Multimodal. Razona sobre el mensaje del cliente,
 * el catálogo, el historial y genera la respuesta final.
 */
export async function runCore(
  msg: ParsedMessage,
  ctx: LoadedContext,
  sentryResult: SentryResult
): Promise<CoreResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // ── 1. Cargar historial de conversación ───────────────────────────
  const history = await prisma.chatHistory.findMany({
    where: {
      organizationId: ctx.organizationId,
      customerPhone: msg.remoteJid,
    },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
  })

  // Invertir para orden cronológico
  const historyMessages = history.reverse().map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }))

  // ── 2. Construir el mensaje del usuario (con imagen si aplica) ────
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }

  const userContent: ContentPart[] = []

  if (msg.messageType === "image") {
    // Si hay imagen: visión multimodal
    if (msg.imageBase64 && msg.imageMimetype) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${msg.imageMimetype};base64,${msg.imageBase64}`,
          detail: "low", // low = más rápido y barato para comparación de productos
        },
      })
    } else if (msg.imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: msg.imageUrl, detail: "low" },
      })
    }

    if (msg.text) {
      userContent.push({ type: "text", text: msg.text })
    } else {
      userContent.push({
        type: "text",
        text: "(El cliente envió una imagen sin texto. Analiza qué es y compáralo con el catálogo si aplica.)",
      })
    }
  } else {
    userContent.push({ type: "text", text: msg.text ?? "" })
  }

  // ── 3. Ejecutar el modelo ─────────────────────────────────────────
  const cleanPhone = msg.remoteJid.replace("@s.whatsapp.net", "")
  const activeReserva = await prisma.reserva.findFirst({
    where: {
      organizationId: ctx.organizationId,
      cliente_id: cleanPhone,
      estado: { in: ["pendiente_aprobacion", "reagendado"] }
    },
    orderBy: { updatedAt: "desc" }
  })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildSystemPrompt(ctx, sentryResult, history.length === 0, activeReserva) },
      ...historyMessages,
      { role: "user", content: userContent },
    ],
    max_tokens: 600,
    temperature: 0.7,
  })

  const rawResponse = completion.choices[0]?.message?.content ?? ""
  const tokensUsed = completion.usage?.total_tokens ?? 0

  // ── 4. Parsear etiquetas de control ──────────────────────────────
  const fotoMatches = Array.from(rawResponse.matchAll(/FOTO_URL:\s*(https?:\/\/\S+)/gi))
  const imageUrls = fotoMatches.map(m => m[1].trim())
  const hasImage = imageUrls.length > 0
  const imageUrl = hasImage ? imageUrls[0] : null
  const isPagoSolicitado = /PAGO_SOLICITADO:/i.test(rawResponse)

  // Parsear PEDIDO_CONFIRMADO con datos opcionales
  const pedidoMatch = rawResponse.match(/PEDIDO_CONFIRMADO:({.+})/i)
  const isPedidoConfirmado = /PEDIDO_CONFIRMADO:/i.test(rawResponse)
  let pedidoData = null
  if (pedidoMatch) {
    try {
      pedidoData = JSON.parse(pedidoMatch[1])
    } catch (e) {
      console.error("[CORE_PARSE_ERROR]: Error al parsear JSON de pedido")
    }
  }

  const agendarJSONMatch = rawResponse.match(/AGENDAR_CITA:\s*({.+})/i)
  const agendarTextMatch = rawResponse.match(/AGENDAR_CITA:\s*([^,]+),\s*(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2})/i)
  
  let agendarCita = null
  
  if (agendarJSONMatch) {
    try {
      agendarCita = JSON.parse(agendarJSONMatch[1])
    } catch (e) {
      console.error("[CORE_PARSE_ERROR]: Error al parsear JSON de agendamiento")
    }
  } else if (agendarTextMatch) {
    // Contingencia para formato de texto: Limpieza, 13/4/2026, 16:00
    agendarCita = {
      service: agendarTextMatch[1].trim(),
      date: agendarTextMatch[2].trim(),
      time: agendarTextMatch[3].trim()
    }
    console.log("[CORE_FALLBACK]: Usando formato de texto para agendamiento")
  }

  // Parsear ESCALADO_SOPORTE
  const escalationMatch = rawResponse.match(/ESCALADO_SOPORTE:({.+})/i)
  const isEscaladoSoporte = /ESCALADO_SOPORTE:/i.test(rawResponse)
  let escalationData = null
  if (escalationMatch) {
    try {
      escalationData = JSON.parse(escalationMatch[1])
    } catch (e) {
      console.error("[CORE_PARSE_ERROR]: Error al parsear JSON de escalado")
    }
  }

  // Parsear SOLICITAR_RESERVA (robusto a espacios, saltos de línea y bloques de código)
  let solicitarReserva = null
  const reservaMatch = rawResponse.match(/SOLICITAR_RESERVA:\s*([\s\S]+)/i)
  if (reservaMatch) {
    const content = reservaMatch[1].trim()
    const startIdx = content.indexOf("{")
    const endIdx = content.lastIndexOf("}")
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = content.substring(startIdx, endIdx + 1)
      try {
        solicitarReserva = JSON.parse(jsonStr)
      } catch (e) {
        console.error("[CORE_PARSE_ERROR]: Error al parsear JSON de reserva", jsonStr, e)
      }
    }
  }


  let userName = null
  let summary = null

  const nameMatch = rawResponse.match(/\[USER_NAME:\s*(.+?)\]/i)
  if (nameMatch) userName = nameMatch[1].trim()

  const summaryMatch = rawResponse.match(/\[SUMMARY:\s*(.+?)\]/i)
  if (summaryMatch) summary = summaryMatch[1].trim()

  // ── 5. Limpiar texto para el cliente ──────────────────────────────
  let cleanText = rawResponse
    .replace(/FOTO_URL:\s*(https?:\/\/\S+)/gi, "")
    .replace(/PEDIDO_CONFIRMADO:({.+})/gi, "")
    .replace(/PEDIDO_CONFIRMADO:/gi, "")
    .replace(/PAGO_SOLICITADO:/gi, "")
    .replace(/AGENDAR_CITA:({.+})/gi, "")
    .replace(/AGENDAR_CITA:[^.\n]+/gi, "") // Limpiar formato de texto también
    .replace(/ESCALADO_SOPORTE:({.+})/gi, "")
    .replace(/SOLICITAR_RESERVA:\s*({[\s\S]+?})/gi, "")
    .replace(/SOLICITAR_RESERVA:\s*```json[\s\S]+?```/gi, "")
    .replace(/SOLICITAR_RESERVA:\s*```[\s\S]+?```/gi, "")
    .replace(/\[USER_NAME:\s*(.+?)\]/gi, "")
    .replace(/\[SUMMARY:\s*(.+?)\]/gi, "")
    .replace(/^(MENSAJE|CONFIRMACION|PEDIDO):/gi, "")
    // Limpiar prefijos de intención
    .replace(/^(MENSAJE|CONFIRMACION|PEDIDO)\s+/gi, "") // Limpiar palabras sueltas al inicio

  // Limpiar cualquier URL del menú que haya podido quedar en el texto
  if (ctx.menuImages && ctx.menuImages.length > 0) {
    ctx.menuImages.forEach(url => {
      const escapedUrl = url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:FOTO_URL:\\s*)?\\(?[\\s]*${escapedUrl}[\\s]*\\)?`, 'gi');
      cleanText = cleanText.replace(regex, "");
    });
  }

  // Limpiar espacios múltiples y saltos de línea sobrantes
  cleanText = cleanText
    .replace(/:\s*$/g, "") // Eliminar dos puntos al final de una frase si queda vacía la continuación
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  // ── 6. Persistir en historial ─────────────────────────────────────
  await prisma.chatHistory.createMany({
    data: [
      {
        organizationId: ctx.organizationId,
        customerPhone: msg.remoteJid,
        role: "user",
        content: msg.text ?? "[imagen]",
      },
      {
        organizationId: ctx.organizationId,
        customerPhone: msg.remoteJid,
        role: "assistant",
        content: rawResponse,
      },
    ],
  })

  return {
    rawResponse,
    hasImage: hasImage,
    imageUrl,
    imageUrls,
    isPedidoConfirmado,
    pedidoData,
    isPagoSolicitado,
    agendarCita,
    isEscaladoSoporte,
    escalationData,
    solicitarReserva,
    userName,
    summary,
    cleanText,
    tokensUsed,
  }
}
