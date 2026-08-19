/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 3: THE SENTRY
 *  El Clasificador. Velocidad estratosférica.
 *  Groq + Llama 3.1-8b-instant.
 *  Coste: microsegundos. Precisión: quirúrgica.
 * ─────────────────────────────────────────────────
 */

import Groq from "groq-sdk"

export type Intent =
  | "VENTAS"
  | "CONSULTA_PRODUCTO"
  | "SOPORTE"
  | "INFO_NEGOCIO"
  | "SALUDO"
  | "PAGO"
  | "UNKNOWN"

export interface SentryResult {
  intent: Intent
  needs_inventory: boolean   // ¿debe el Context Loader traer productos?
  confidence: "HIGH" | "MED" | "LOW"
}

const SENTRY_SYSTEM_PROMPT = `Eres un clasificador de intenciones para un asistente de ventas de e-commerce por WhatsApp.
Analiza el mensaje del cliente y responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra.

Estructura exacta:
{"intent":"VENTAS|CONSULTA_PRODUCTO|SOPORTE|INFO_NEGOCIO|SALUDO|PAGO|UNKNOWN","needs_inventory":true|false,"confidence":"HIGH|MED|LOW"}

Reglas:
- VENTAS: quiere comprar, precio, disponibilidad, "cuánto cuesta", "tienen X"
- CONSULTA_PRODUCTO: compara productos, pide foto, características, tallas
- SOPORTE: problema con pedido, queja, devolución, envío, quiere hablar con un "humano", "encargado", "agente" o "persona"
- INFO_NEGOCIO: horarios, dirección, métodos de pago, redes sociales
- SALUDO: hola, buenos días, inicio de conversación sin intención clara
- PAGO: envía comprobante, menciona que ya pagó, referencia de pago
- needs_inventory: true si necesita ver el catálogo para responder
- confidence: HIGH si hay certeza, MED si es probable, LOW si es ambiguo`

/**
 * Clasifica la intención del mensaje con Groq.
 * Timeout de 4s — si falla, retorna fallback seguro.
 */
export async function runSentry(
  userText: string,
  imageDescription?: string
): Promise<SentryResult> {
  const FALLBACK: SentryResult = {
    intent: "UNKNOWN",
    needs_inventory: false,
    confidence: "LOW",
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const userContent = imageDescription
      ? `[IMAGEN ADJUNTA: ${imageDescription}]\n\nTexto del cliente: ${userText || "(sin texto)"}`
      : userText

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const completion = await groq.chat.completions.create(
      {
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: SENTRY_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 80,
        temperature: 0,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal as any }
    )

    clearTimeout(timeout)

    const raw = completion.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(raw)

    return {
      intent: parsed.intent ?? "UNKNOWN",
      needs_inventory: parsed.needs_inventory ?? false,
      confidence: parsed.confidence ?? "LOW",
    }
  } catch (err: any) {
    // Timeout o error de Groq — no bloquear el pipeline
    console.warn("[SENTRY_WARN]: Fallback activado.", err?.message ?? err)
    return FALLBACK
  }
}
