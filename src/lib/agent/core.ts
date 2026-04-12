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

  return `Eres el asistente de ventas de WhatsApp de "${ctx.companyName}".
Tu rol: vendedor experto, empático y conciso. Nunca robótico.

═══════════════════════════════════
IDENTIDAD DEL NEGOCIO
═══════════════════════════════════
Nombre: ${ctx.companyName}
Producto/Servicio principal: ${ctx.service}
Descripción: ${ctx.description}

═══════════════════════════════════
INFORMACIÓN OPERATIVA
═══════════════════════════════════
Horarios de atención: ${scheduleStr}
${contactParts ? `\nContacto y redes:\n${contactParts}` : ""}

═══════════════════════════════════
${menuProducts.length > 0 ? `MENÚ Y CARTA (LECTURA REQUERIDA)\n═══════════════════════════════════\n${menuInfo}` : ""}
${sentryResult.needs_inventory ? `CATÁLOGO DISPONIBLE\n═══════════════════════════════════\n${catalogStr}` : "MODO: Consulta general (catálogo no requerido)"}

═══════════════════════════════════
PROTOCOLO DE RESPUESTA
═══════════════════════════════════
1. Responde siempre en el mismo idioma que usa el cliente.
2. Sé breve: máximo 3 párrafos o 5 ítems de lista por respuesta.
3. Si el cliente pregunta por el MENÚ, la CARTA o QUÉ TIENEN PARA COMER, DEBES enviar la foto del menú usando:
   FOTO_URL:${menuProducts[0]?.imageUrl || "<No hay URL disponible>"}
4. Si el cliente pregunta por un producto específico y tienes foto URL, incluye la etiqueta:
   FOTO_URL:<url_exacta_del_producto>
5. Si el cliente confirma una compra, incluye la etiqueta:
   PEDIDO_CONFIRMADO:
6. Si el cliente quiere saber cómo pagar, incluye la etiqueta:
   PAGO_SOLICITADO:
7. NUNCA inventes precios, stock o información que no esté en el catálogo o en el menú analizado.
8. Si no sabes algo, di honestamente que consultarás y le avisarás.
9. Usa emojis con moderación para mantener un tono humano pero profesional.
10. Las etiquetas de control (FOTO_URL:, PEDIDO_CONFIRMADO:, PAGO_SOLICITADO:) van en líneas separadas AL FINAL del mensaje.
11. IMPORTANTE: El [MENÚ EN IMAGEN] contiene el texto extraído de la foto del menú. Úsalo para saber qué platos ofreces.`

}

export interface CoreResult {
  rawResponse: string
  hasImage: boolean
  imageUrl: string | null
  isPedidoConfirmado: boolean
  isPagoSolicitado: boolean
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

  // ── 5. Limpiar texto para el cliente ──────────────────────────────
  const cleanText = rawResponse
    .replace(/FOTO_URL:(https?:\/\/\S+)/gi, "")
    .replace(/PEDIDO_CONFIRMADO:/gi, "")
    .replace(/PAGO_SOLICITADO:/gi, "")
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
    cleanText,
    tokensUsed,
  }
}
