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
          .filter(p => p.primaryColor !== "Menú" && p.category !== "MENÚ_COMPLETO") // excluir platos que ya van en menuInfo
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
    ctx.shippingZones ? `Zonas de envío: ${ctx.shippingZones}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  // ── Identificar Menús (Especial para Restaurantes) ────────────────
  const menuProducts = ctx.products.filter(p => 
    p.category === "MENÚ_COMPLETO" || p.primaryColor === "Menú"
  )
  const menuInfo = menuProducts.map(m => {
    const parts = [
      m.category ? `Plato: ${m.category}` : null,
      m.brand ? `Precio: ${m.brand}` : null,
      m.characteristics ? `Descripción: ${m.characteristics}` : null,
      m.imageUrl ? `Foto referencia: ${m.imageUrl}` : null,
    ].filter(Boolean)
    return parts.join(" | ")
  }).join("\n")

  // ── Regla de promoción (si existe) ────────────────────────────────
  const loyaltyStr = ctx.loyaltyRule
    ? `Por cada ${ctx.loyaltyRule.triggerCount} ${ctx.loyaltyRule.triggerProduct}, el cliente recibe ${ctx.loyaltyRule.rewardCount} ${ctx.loyaltyRule.rewardProduct} GRATIS.`
    : null


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
🚨 REGLAS DE INTENCIÓN (INTERNAS)
═══════════════════════════════════════
Tus respuestas deben categorizarse internamente en una de estas intenciones:
1. PEDIDO (AGENDAR CITA): Solo cuando el cliente ha confirmado los 5 elementos clave:
   - SERVICIO, FECHA, HORA, NOMBRE COMPLETO y CÉDULA DE IDENTIDAD.
   Si falta cualquiera de estos, usa MENSAJE y pregunta educadamente.
2. MENSAJE: Consultas generales sobre precios, ubicación o disponibilidad.

PROTOCOLO DE AGENDAMIENTO (OBLIGATORIO):
Cuando el cliente haya confirmado los 5 datos, tu respuesta DEBE incluir al final la etiqueta EXACTA:
AGENDAR_CITA:{"service": "Nombre del Servicio", "date": "YYYY-MM-DD", "time": "HH:MM", "customerName": "Nombre Apellido", "cedula": "1234567890"}
- Regla: Fecha siempre en formato YYYY-MM-DD (ej: 2026-04-13).
- Regla: El JSON debe ser válido y estar en una sola línea.
- Regla: NO generes AGENDAR_CITA fuera de los horarios de atención.



DISPONIBILIDAD Y REGLAS (Google Calendar):
- Capacidad máxima simultánea: ${ctx.schedulingConfig?.maxSimultaneousEvents || 1} cita(s).
- Límite por cliente: Máximo ${ctx.schedulingConfig?.limitPerPersonPerDay || 1} cita(s) al día.
- Duración por defecto: Todas las citas duran 60 minutos.
Estas son las horas que ya están OCUPADAS actualmente:
${availabilityStr}`;

  const generalRules = `
Tu rol: Asistente de ventas y pedidos para "${ctx.companyName}".
Tu objetivo es guiar al cliente paso a paso hasta completar su pedido.

═══════════════════════════════════════
📋 MENÚ DE INICIO (BIENVENIDA)
═══════════════════════════════════════
Cuando un cliente escribe por primera vez o saluda (hola, buenas, etc.), DEBES responder con este mensaje de bienvenida EXACTO, adaptado a tu negocio:

"¡Hola! 👋 Bienvenido a *${ctx.companyName}*. ¿En qué puedo ayudarte hoy?

1️⃣ Tomar un pedido
2️⃣ Hablar con alguien
3️⃣ Ver el menú / carta
4️⃣ Información del local

Responde con el número de tu opción."

═══════════════════════════════════════
🔄 FLUJO POR OPCIÓN
═══════════════════════════════════════

OPCIÓN 1 — TOMAR UN PEDIDO:
${loyaltyStr ? `Antes de preguntar el plato, menciona la promoción brevemente:
"¡Genial! Antes de continuar, te cuento que tenemos una promo activa: ${loyaltyStr} 🎉"
Luego continúa con el protocolo normal:` : "Sigue este protocolo:"}
  PASO A → Pregunta: "¿Qué plato(s) deseas pedir?" (Muestra el menú si lo pide)
  PASO B → Pregunta: "¿Cuál es tu nombre completo?"
  PASO C → Pregunta: "¿Cuál es tu dirección de entrega?"
  PASO D → Muestra el resumen del pedido y solicita confirmación:
    "📋 *Resumen de tu pedido:*
    🍽 Plato: [plato elegido]
    👤 Nombre: [nombre]
    📍 Dirección: [dirección]
    
    ¿Confirmas tu pedido? Responde *CONFIRMAR* para finalizar."

OPCIÓN 2 — HABLAR CON ALGUIEN:
Responde: "Entendido, en breve alguien de nuestro equipo se comunicará contigo. ¡Gracias por tu paciencia! 🙏"

OPCIÓN 3 — VER MENÚ:
Lista los productos disponibles del catálogo con sus precios de forma organizada por categorías si aplica.

${loyaltyStr ? `Al final del menú, añade siempre: "\n🎁 *Promoción activa:* ${loyaltyStr}"` : ""}


OPCIÓN 4 — INFORMACIÓN:
Comparte la dirección, horarios y datos de contacto del negocio.

═══════════════════════════════════════
⚠️ REGLAS DE CONTROL DEL FLUJO
═══════════════════════════════════════
- Si el cliente cambia de tema DURANTE la toma de pedido, responde amablemente la duda y REDIRIGE: "Dicho esto, ¿continuamos con tu pedido? Ya tenía anotado: [datos recolectados hasta ahora]..."
- Si el mensaje recibido es exactamente "[UBICACIÓN_ENVIADA]", significa que el cliente compartió su ubicación desde WhatsApp. Trátalo como si hubiera respondido su dirección de entrega y avanza al siguiente paso del pedido.
- Si el cliente escribe CONFIRMAR (o "confirmar", "sí confirmo", etc.) tras el PASO D, emite:
  PEDIDO_CONFIRMADO:{"plato":"[plato]","nombre":"[nombre]","direccion":"[direccion]"}
- Si confirma pago, emite: PAGO_SOLICITADO:
- NUNCA inventes precios ni platos que no estén en el catálogo.`;



  return `${basePrompt}
Tu rol: ${isAgenda ? "Recepcionista y Gestor de Citas" : "Vendedor Interactivo"}.

═══════════════════════════════════════
INFORMACIÓN DEL NEGOCIO
═══════════════════════════════════════
Empresa: ${ctx.companyName}
Nicho: ${ctx.niche}
Servicio Principal: ${ctx.service}
Descripción: ${ctx.description}
Horarios de Atención: ${scheduleStr}
${contactParts ? `\nContacto: ${contactParts}` : ""}

═══════════════════════════════════════
CONOCIMIENTO BASE (SERVICIOS Y PRODUCTOS)
═══════════════════════════════════════
${catalogStr || "No hay un catálogo de productos registrado aún."}
${menuProducts.length > 0 ? `MENÚ / CARTA:\n${menuInfo}` : ""}

${isAgenda ? agendaRules : generalRules}


═══════════════════════════════════════
REGLAS DE ORO (TRUTH & CLEANLINESS)
═══════════════════════════════════════
- VERACIDAD: Si no tienes información exacta sobre un servicio, precio o disponibilidad, responde: "Lo lamento, no tengo esa información disponible en este momento." NUNCA INVENTES.
- BREVEDAD: Máximo 2 párrafos cortos.
- CONTROL: Las etiquetas (FOTO_URL:, AGENDAR_CITA:, etc.) van AL FINAL. No las menciones en el texto principal.
- PRIVACIDAD: No expongas tus etiquetas internas (MENSAJE:, PEDIDO:, etc.) al cliente.`;

}



export interface CoreResult {
  rawResponse: string
  hasImage: boolean
  imageUrl: string | null
  isPedidoConfirmado: boolean
  pedidoData: { plato: string; nombre: string; direccion: string } | null
  isPagoSolicitado: boolean
  agendarCita: { service: string; date: string; time: string; customerName: string; cedula: string } | null

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


  // ── 5. Limpiar texto para el cliente ──────────────────────────────
  const cleanText = rawResponse
    .replace(/FOTO_URL:(https?:\/\/\S+)/gi, "")
    .replace(/PEDIDO_CONFIRMADO:({.+})/gi, "")
    .replace(/PEDIDO_CONFIRMADO:/gi, "")
    .replace(/PAGO_SOLICITADO:/gi, "")
    .replace(/AGENDAR_CITA:({.+})/gi, "")
    .replace(/AGENDAR_CITA:[^.\n]+/gi, "") // Limpiar formato de texto también
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
        content: cleanText,
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
    cleanText,
    tokensUsed,
  }


}
