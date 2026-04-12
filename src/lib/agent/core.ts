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

/**
 * Construye el System Prompt dinámico usando los datos del onboarding.
 * Cada pieza de información está precisamente colocada.
 */
function buildSystemPrompt(
  ctx: LoadedContext,
  sentryResult: SentryResult
): string {
  // ── Horarios formateados ───────────────────────────────────────────
  const scheduleStr =
    ctx.scheduleDays.length > 0
      ? `${ctx.scheduleDays.join(", ")} de ${ctx.openTime} a ${ctx.closeTime}`
      : "No especificado"

  // ── Catálogo de productos formateado ──────────────────────────────
  const catalogStr =
    ctx.products.length > 0
      ? ctx.products
          .map((p, i) => {
            const parts = [
              `[Producto ${i + 1}]`,
              p.category ? `Categoría: ${p.category}` : null,
              p.brand ? `Marca: ${p.brand}` : null,
              p.primaryColor ? `Color principal: ${p.primaryColor}` : null,
              p.secondaryColor ? `Color secundario: ${p.secondaryColor}` : null,
              p.characteristics ? `Características: ${p.characteristics}` : null,
              p.style ? `Estilo: ${p.style}` : null,
              p.imageUrl ? `Foto: ${p.imageUrl}` : null,
            ].filter(Boolean)
            return parts.join("\n")
          })
          .join("\n\n")
      : "No hay productos cargados en el sistema."

  // ── Información de contacto y redes ───────────────────────────────
  const contactParts = [
    ctx.address ? `Dirección: ${ctx.address}` : null,
    ctx.website ? `Web: ${ctx.website}` : null,
    ctx.instagram ? `Instagram: ${ctx.instagram}` : null,
    ctx.facebook ? `Facebook: ${ctx.facebook}` : null,
    ctx.contactEmail ? `Email: ${ctx.contactEmail}` : null,
    ctx.contactPhone ? `Teléfono adicional: ${ctx.contactPhone}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  // ── Identificar Menús (Especial para Restaurantes) ────────────────
  const menuProducts = ctx.products.filter(p => p.category === "MENÚ_COMPLETO")
  const menuInfo = menuProducts.map(m => `[MENÚ EN IMAGEN]: ${m.characteristics} (URL: ${m.imageUrl})`).join("\n")

  // ── Calendario formateado ──────────────────────────────────────────
  const availabilityStr = ctx.calendarAvailability && ctx.calendarAvailability.length > 0
    ? ctx.calendarAvailability.map(s => `- Ocupado: ${s.start} a ${s.end}`).join("\n")
    : "Todo el horario laboral está disponible."

  const isAgenda = ctx.niche.toUpperCase() === "AGENDA";

  const basePrompt = `Eres el asistente virtual experto de "${ctx.companyName}".
La fecha y hora actual es: ${new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}.`;

  const agendaRules = `
Tu objetivo principal es agendar citas de manera eficiente y profesional.
═══════════════════════════════════════
🚨 REGLAS DE INTENCIÓN (OBLIGATORIO)
═══════════════════════════════════════
Tus respuestas deben categorizarse internamente en una de estas 3 intenciones:
1. PEDIDO (AGENDAR CITA): Solo cuando el cliente ha confirmado los 3 elementos clave: FECHA, HORA y SERVICIO.
   Si faltan datos, usa MENSAJE y pregunta educadamente.
2. CONFIRMACION: El cliente desea cambiar, mover o cancelar una cita ya existente.
3. MENSAJE: Consultas generales sobre precios, ubicación o disponibilidad.

Si agendas una cita, DEBES incluir al final la etiqueta:
AGENDAR_CITA:{"service":"nombre_del_servicio","date":"YYYY-MM-DD","time":"HH:mm"}

═══════════════════════════════════════
DISPONIBILIDAD Y REGLAS (Google Calendar)
═══════════════════════════════════════
- Capacidad máxima simultánea: ${ctx.schedulingConfig?.maxSimultaneousEvents || 1} cita(s).
- Límite por cliente: Máximo ${ctx.schedulingConfig?.limitPerPersonPerDay || 1} cita(s) al día.
- Duración por defecto: Todas las citas duran 60 minutos.
Estas son las horas que ya están OCUPADAS:
${availabilityStr}`;

  const generalRules = `
Tu rol: vendedor experto, empático y conciso.
═══════════════════════════════════════
PROTOCOLO DE RESPUESTA (VENTAS)
═══════════════════════════════════════
1. Si el cliente pregunta por el MENÚ o QUÉ TIENEN PARA COMER, DEBES enviar la foto del menú usando: FOTO_URL:${menuProducts[0]?.imageUrl || ""}
2. Si el cliente pregunta por un producto específico y tienes su foto, úsala: FOTO_URL:<url_exacta_del_producto>
3. Si confirma una compra, usa la etiqueta: PEDIDO_CONFIRMADO:
4. Si pide cómo pagar, usa: PAGO_SOLICITADO:

${sentryResult.needs_inventory ? `CATÁLOGO DISPONIBLE:\n${catalogStr}` : ""}
${menuProducts.length > 0 ? `MENÚ / CARTA:\n${menuInfo}` : ""}`;

  return `${basePrompt}
Tu rol: ${isAgenda ? "Recepcionista y Gestor de Citas" : "Vendedor Interactivo"}.

═══════════════════════════════════════
INFORMACIÓN DEL NEGOCIO
═══════════════════════════════════════
Empresa: ${ctx.companyName}
Nicho: ${ctx.niche}
Servicio: ${ctx.service}
Descripción: ${ctx.description}
Horarios: ${scheduleStr}
${contactParts ? `\nContacto: ${contactParts}` : ""}

${isAgenda ? agendaRules : generalRules}

═══════════════════════════════════════
REGLAS FINALES
═══════════════════════════════════════
- Sé breve y profesional. Máximo 2 párrafos.
- Nunca inventes información.
- Las etiquetas de control (FOTO_URL:, PEDIDO_CONFIRMADO:, PAGO_SOLICITADO:, AGENDAR_CITA:) van en líneas separadas AL FINAL.`

}


export interface CoreResult {
  rawResponse: string
  hasImage: boolean
  imageUrl: string | null
  isPedidoConfirmado: boolean
  isPagoSolicitado: boolean
  agendarCita: { service: string; date: string; time: string } | null
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
      { role: "system", content: buildSystemPrompt(ctx, sentryResult) },
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
  const isPedidoConfirmado = /PEDIDO_CONFIRMADO:/i.test(rawResponse)
  const isPagoSolicitado = /PAGO_SOLICITADO:/i.test(rawResponse)

  const agendarMatch = rawResponse.match(/AGENDAR_CITA:({.+})/i)
  let agendarCita = null
  if (agendarMatch) {
    try {
      agendarCita = JSON.parse(agendarMatch[1])
    } catch (e) {
      console.error("[CORE_PARSE_ERROR]: Error al parsear JSON de agendamiento")
    }
  }

  // ── 5. Limpiar texto para el cliente ──────────────────────────────
  const cleanText = rawResponse
    .replace(/FOTO_URL:(https?:\/\/\S+)/gi, "")
    .replace(/PEDIDO_CONFIRMADO:/gi, "")
    .replace(/PAGO_SOLICITADO:/gi, "")
    .replace(/AGENDAR_CITA:({.+})/gi, "")
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
        content: cleanText,
      },
    ],
  })

  return {
    rawResponse,
    hasImage: !!imageUrl,
    imageUrl,
    isPedidoConfirmado,
    isPagoSolicitado,
    agendarCita,
    cleanText,
    tokensUsed,
  }

}
