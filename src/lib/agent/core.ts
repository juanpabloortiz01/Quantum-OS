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
  isNewConversation: boolean
): string {
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
            const parts = [
              `[Item ${i + 1}]`,
              p.category ? `Categoría: ${p.category}` : null,
              p.brand ? `Información/Precio: ${p.brand}` : null,
              p.characteristics ? `Descripción: ${p.characteristics}` : null,
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
    const parts = [
      m.category ? `Nombre: ${m.category}` : null,
      m.brand ? `Precio/Valor: ${m.brand}` : null,
      m.characteristics ? `Descripción: ${m.characteristics}` : null,
    ].filter(Boolean)
    return parts.join(" | ")
  }).join("\n")

  const isAgenda = ctx.niche.toUpperCase() === "AGENDA";

  const basePrompt = `Eres el asistente virtual experto de "${ctx.companyName}".
La fecha y hora actual es: ${new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}.`;

  const welcomeMenu = `
"¡Hola! 👋 Bienvenido a *${ctx.companyName}*. ¿En qué puedo ayudarte hoy?

1️⃣ ${isAgenda ? "Agendar una cita" : "Tomar un pedido"}
2️⃣ Hablar con alguien
3️⃣ ${isAgenda ? "Ver servicios" : "Ver el menú / carta"}
4️⃣ Información del local

Responde con el número de tu opción."`;

  const escalationLogic = `
OPCIÓN 2 — HABLAR CON ALGUIEN:
1. Pregunta amablemente: "¿Con quién tengo el gusto? Así puedo avisar ahora mismo a la recepción para que te atienda personalmente."
2. Una vez que el cliente responda su nombre, emite la etiqueta EXACTA al final:
   ESCALADO_SOPORTE:{"nombre": "[nombre del cliente]"}
3. Responde al cliente: "Perfecto [nombre del cliente], acabo de avisar a la recepción. En breve se comunicarán contigo por este medio. ¡Gracias por tu paciencia! 🙏"`;

  const agendaRules = `
OPCIÓN 1 — AGENDAR UNA CITA:
Solo cuando el cliente ha confirmado los 5 elementos clave:
- SERVICIO, FECHA, HORA, NOMBRE COMPLETO y CÉDULA DE IDENTIDAD.
Si falta cualquiera de estos, pídela con amabilidad.

PROTOCOLO DE AGENDAMIENTO (OBLIGATORIO):
Cuando el cliente haya confirmado los 5 datos, tu respuesta DEBE incluir al final la etiqueta EXACTA:
AGENDAR_CITA:{"service": "Nombre del Servicio", "date": "YYYY-MM-DD", "time": "HH:MM", "customerName": "Nombre Apellido", "cedula": "1234567890"}

REGLAS DE DISPONIBILIDAD:
- Horario: ${scheduleStr}
- Ocupado actualmente:
${ctx.calendarAvailability && ctx.calendarAvailability.length > 0
    ? ctx.calendarAvailability.map(s => `- De ${s.start} a ${s.end}`).join("\n")
    : "Sin reservaciones previas."}
- Duración: 60 min por cita.`;

  const generalRules = `
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

OPCIÓN 3 — VER ${isAgenda ? "SERVICIOS" : "MENÚ"}:
Lista los productos/servicios disponibles de forma organizada.

OPCIÓN 4 — INFORMACIÓN:
Dirección: ${ctx.address || "No especificada"}
Horarios: ${scheduleStr}
${contactParts}

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
  isPedidoConfirmado: boolean
  pedidoData: { plato: string; nombre: string; direccion: string } | null
  isPagoSolicitado: boolean
  agendarCita: { service: string; date: string; time: string; customerName: string; cedula: string } | null
  isEscaladoSoporte: boolean
  escalationData: { nombre: string } | null

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
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildSystemPrompt(ctx, sentryResult, history.length === 0) },
      ...historyMessages,
      { role: "user", content: userContent },
    ],
    max_tokens: 600,
    temperature: 0.7,
  })

  const rawResponse = completion.choices[0]?.message?.content ?? ""
  const tokensUsed = completion.usage?.total_tokens ?? 0

  // ── 4. Parsear etiquetas de control ──────────────────────────────
  const fotoMatch = rawResponse.match(/FOTO_URL:(https?:\/\/\S+)/i)
  const imageUrl = fotoMatch ? fotoMatch[1].trim() : null
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


  let userName = null
  let summary = null

  const nameMatch = rawResponse.match(/\[USER_NAME:\s*(.+?)\]/i)
  if (nameMatch) userName = nameMatch[1].trim()

  const summaryMatch = rawResponse.match(/\[SUMMARY:\s*(.+?)\]/i)
  if (summaryMatch) summary = summaryMatch[1].trim()

  // ── 5. Limpiar texto para el cliente ──────────────────────────────
  const cleanText = rawResponse
    .replace(/FOTO_URL:(https?:\/\/\S+)/gi, "")
    .replace(/PEDIDO_CONFIRMADO:({.+})/gi, "")
    .replace(/PEDIDO_CONFIRMADO:/gi, "")
    .replace(/PAGO_SOLICITADO:/gi, "")
    .replace(/AGENDAR_CITA:({.+})/gi, "")
    .replace(/AGENDAR_CITA:[^.\n]+/gi, "") // Limpiar formato de texto también
    .replace(/ESCALADO_SOPORTE:({.+})/gi, "")
    .replace(/\[USER_NAME:\s*(.+?)\]/gi, "")
    .replace(/\[SUMMARY:\s*(.+?)\]/gi, "")
    .replace(/^(MENSAJE|CONFIRMACION|PEDIDO):/gi, "")
 // Limpiar prefijos de intención
    .replace(/^(MENSAJE|CONFIRMACION|PEDIDO)\s+/gi, "") // Limpiar palabras sueltas al inicio
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
    hasImage: !!imageUrl,
    imageUrl,
    isPedidoConfirmado,
    pedidoData,
    isPagoSolicitado,
    agendarCita,
    isEscaladoSoporte,
    escalationData,
    userName,
    summary,
    cleanText,
    tokensUsed,
  }
}
