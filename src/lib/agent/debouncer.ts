/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — MESSAGE DEBOUNCER
 *  Agrupa mensajes rápidos del mismo cliente antes
 *  de pasar al pipeline. Evita respuestas a cada
 *  mensaje individual cuando el usuario está
 *  escribiendo una idea en partes.
 * ─────────────────────────────────────────────────
 */

import { ParsedMessage } from "./logic-filter"

const DEBOUNCE_MS = 3500 // 3.5 segundos de silencio para asegurar una idea completa

interface PendingBatch {
  messages: ParsedMessage[]       // Mensajes acumulados
  timer: NodeJS.Timeout
}

// Store en memoria por JID (número de WhatsApp)
const pending = new Map<string, PendingBatch>()

/**
 * Agrupa mensajes rápidos de texto del mismo cliente.
 * Los mensajes de tipo multimedia (imagen, ubicación, etc.) se envían inmediatamente.
 */
export function bufferMessage(
  msg: ParsedMessage,
  callback: (combinedMsg: ParsedMessage) => void
): void {
  const jid = msg.remoteJid

  // Si no es texto (por ejemplo, imagen o ubicación), se procesa de inmediato sin esperar
  if (msg.messageType !== "text") {
    console.log(`[DEBOUNCER]: JID ${jid} → Mensaje multimedia/no-texto, procesando inmediatamente.`)
    callback(msg)
    return
  }

  const existing = pending.get(jid)

  if (existing) {
    // Cancelar el temporizador anterior y acumular el nuevo mensaje
    clearTimeout(existing.timer)
    existing.messages.push(msg)

    // Iniciar un nuevo temporizador
    existing.timer = setTimeout(() => {
      const batch = pending.get(jid)
      if (batch) {
        pending.delete(jid)
        const combinedText = batch.messages.map(m => m.text).filter(Boolean).join("\n")
        console.log(`[DEBOUNCER]: JID ${jid} → ${batch.messages.length} mensajes combinados: "${combinedText.slice(0, 80)}..."`)

        // Usar el último mensaje como base para el timestamp y metadatos, pero con el texto combinado
        const combinedMsg: ParsedMessage = {
          ...batch.messages[batch.messages.length - 1],
          text: combinedText
        }
        callback(combinedMsg)
      }
    }, DEBOUNCE_MS)
  } else {
    // Primer mensaje en el batch, crear nueva cola
    const batch: PendingBatch = {
      messages: [msg],
      timer: setTimeout(() => {}, 0) // placeholder
    }

    batch.timer = setTimeout(() => {
      const currentBatch = pending.get(jid)
      if (currentBatch) {
        pending.delete(jid)
        const combinedText = currentBatch.messages.map(m => m.text).filter(Boolean).join("\n")
        console.log(`[DEBOUNCER]: JID ${jid} → 1 mensaje: "${combinedText.slice(0, 80)}"`)

        const combinedMsg: ParsedMessage = {
          ...currentBatch.messages[currentBatch.messages.length - 1],
          text: combinedText
        }
        callback(combinedMsg)
      }
    }, DEBOUNCE_MS)

    pending.set(jid, batch)
  }
}
