/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — MESSAGE DEBOUNCER
 *  Agrupa mensajes rápidos del mismo cliente antes
 *  de pasar al pipeline. Evita respuestas a cada
 *  mensaje individual cuando el usuario está
 *  escribiendo una idea en partes.
 * ─────────────────────────────────────────────────
 */

const DEBOUNCE_MS = 2500 // 2.5 segundos de silencio = idea completa

interface PendingBatch {
  messages: string[]       // Textos acumulados (solo texto, imágenes pasan directo)
  timer: ReturnType<typeof setTimeout>
  resolve: (combined: string) => void
}

// Store en memoria por JID (número de WhatsApp)
const pending = new Map<string, PendingBatch>()

/**
 * Recibe un mensaje de texto y espera DEBOUNCE_MS milisegundos de silencio.
 * Si llegan más mensajes del mismo JID durante ese tiempo, los acumula.
 * Cuando el silencio cumple, resuelve con todos los mensajes concatenados.
 *
 * Mensajes que NO son texto (imagen, ubicación) se pasan inmediatamente
 * sin debounce para no bloquear el flujo multimedia.
 */
export function debounceMessage(
  jid: string,
  text: string,
  messageType: "text" | "image" | "location"
): Promise<string> {
  // Imágenes y ubicaciones no hacen debounce — pasan directo
  if (messageType !== "text") {
    return Promise.resolve(text)
  }

  return new Promise((resolve) => {
    const existing = pending.get(jid)

    if (existing) {
      // Cancelar el timer anterior y acumular el mensaje
      clearTimeout(existing.timer)
      existing.messages.push(text)

      // Arrancar nuevo timer con la promesa ORIGINAL
      existing.timer = setTimeout(() => {
        const combined = existing.messages.join("\n")
        console.log(`[DEBOUNCER]: JID ${jid} → ${existing.messages.length} mensajes combinados: "${combined.slice(0, 80)}..."`)
        pending.delete(jid)
        existing.resolve(combined)
        // La promesa actual NO necesita resolverse — se resuelve mediante la original
      }, DEBOUNCE_MS)

      // Esta promesa nunca resuelve (la original resuelve para todos)
      // Si necesitamos que cada llamada resuelva independientemente,
      // la encadenamos a la batch:
      existing.resolve = (combined) => resolve(combined)
    } else {
      // Primera vez — crear nuevo batch
      const batch: PendingBatch = {
        messages: [text],
        timer: setTimeout(() => {}, 0), // placeholder
        resolve,
      }

      batch.timer = setTimeout(() => {
        const combined = batch.messages.join("\n")
        console.log(`[DEBOUNCER]: JID ${jid} → ${batch.messages.length} mensaje(s): "${combined.slice(0, 80)}"`)
        pending.delete(jid)
        resolve(combined)
      }, DEBOUNCE_MS)

      pending.set(jid, batch)
    }
  })
}
