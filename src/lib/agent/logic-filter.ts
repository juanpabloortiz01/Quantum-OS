/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 2: LOGIC FILTER
 *  El Centinelo. Primer escudo de acero.
 *  Bloquea el ruido antes de gastar un centavo.
 * ─────────────────────────────────────────────────
 */

// Tipos de mensaje que el pipeline puede procesar
const VALID_MESSAGE_TYPES = new Set([
  "conversation",
  "extendedTextMessage",
  "imageMessage",
  "locationMessage",
])


// Tipos que se descartan silenciosamente (sin log de error)
const SILENT_DISCARD_TYPES = new Set([
  "audioMessage",
  "videoMessage",
  "stickerMessage",
  "documentMessage",
  "reactionMessage",
  "readReceiptMessage",
  "protocolMessage",
  "senderKeyDistributionMessage",
  "ephemeralSettingMessage",
  "callLogMessage",
])

export interface ParsedMessage {
  remoteJid: string
  instanceName: string
  senderPhone: string | null    // Número del negocio (campo 'sender' del webhook raíz)
  messageType: "text" | "image" | "location"
  text: string | null
  imageUrl: string | null       // Base64 o URL directa de EvolutionAPI
  imageBase64: string | null
  imageMimetype: string | null
  fromMe: boolean
  pushName: string | null
  timestamp: number
  // Coordenadas GPS (solo cuando messageType === "location")
  locationLat: number | null
  locationLng: number | null
  locationName: string | null
}


export interface FilterResult {
  valid: boolean
  reason?: string
  parsed: ParsedMessage | null
}

/**
 * Filtra y normaliza el payload crudo de EvolutionAPI.
 * Retorna { valid: false } si el mensaje debe ser ignorado.
 *
 * EvolutionAPI v2 payload structure:
 * {
 *   event: "messages.upsert",
 *   instance: "quos_xxxxx",          ← NIVEL RAÍZ
 *   data: {
 *     key: { remoteJid, fromMe, id },
 *     pushName: "...",
 *     message: { conversation: "..." },
 *     messageTimestamp: 1234567890,
 *   }
 * }
 */
export function applyLogicFilter(raw: any): FilterResult {
  // ── Extraer campos de nivel raíz (estructura EVO v2) ─────────────
  // Evolution v2 manda 'instance' en la raíz. v1 lo mandaba en 'data.instance'.
  const instanceName: string =
    raw?.instance ??             // nivel raíz (v2)
    raw?.data?.instance ??       // anidado (v1)
    raw?.instanceName ??         // fallback
    ""

  console.log(`[LOGIC_FILTER]: Verificando mensaje para instancia: "${instanceName}"`)

  let data = raw?.data ?? raw

  // ── SOPORTE PARA ARRAYS (EVOLUTION v2) ─────────────────────────────
  // Evolution v2 suele mandar los mensajes dentro de un array en 'data'.
  if (Array.isArray(data)) {
    console.log(`[LOGIC_FILTER]: Detectado array de mensajes (v2). Extrayendo el primero.`)
    data = data[0]
  }

  const remoteJid: string = data?.key?.remoteJid ?? ""
  const fromMe: boolean = data?.key?.fromMe ?? false
  const msgObj = data?.message ?? {}
  const pushName: string | null = data?.pushName ?? null
  const timestamp: number = data?.messageTimestamp ?? Date.now()

  // ── FILTROS DE DESCARTE ────────────────────────────────────────────

  // 1. Anti-loop: nunca responder a mensajes propios de forma automatizada, 
  // pero los permitimos pasar para registro de historial.
  const isSelf = fromMe;

  // 2. Descartar mensajes de grupos
  if (remoteJid.endsWith("@g.us")) {
    return { valid: false, reason: "GROUP_MSG: remoteJid de grupo → descartado.", parsed: null }
  }

  // 3. Detectar tipo de mensaje (ignorando metadatos que EvolutionAPI puede incluir primero)
  const keys = Object.keys(msgObj).filter(k => k !== "messageContextInfo")
  const rawType = keys[0] ?? "unknown"

  // 4. Descarte silencioso de tipos no soportados
  if (SILENT_DISCARD_TYPES.has(rawType)) {
    return { valid: false, reason: `UNSUPPORTED_TYPE: ${rawType} → descartado.`, parsed: null }
  }

  // 5. Descarte de tipos desconocidos
  if (!VALID_MESSAGE_TYPES.has(rawType)) {
    return { valid: false, reason: `UNKNOWN_TYPE: ${rawType} → descartado.`, parsed: null }
  }

  // 6. Descartar si no hay remoteJid válido
  // Aceptamos @s.whatsapp.net (estándar) y @lid (cuentas vinculadas/privacidad)
  const isValidJid = remoteJid.endsWith("@s.whatsapp.net") || remoteJid.endsWith("@lid")
  
  if (!remoteJid || !isValidJid) {
    return { valid: false, reason: `INVALID_JID: No es un chat individual válido (${remoteJid}).`, parsed: null }
  }

  // ── PARSEO ────────────────────────────────────────────────────────

  let messageType: "text" | "image" | "location" = "text"

  let text: string | null = null
  let imageUrl: string | null = null
  let imageBase64: string | null = null
  let imageMimetype: string | null = null

  if (rawType === "imageMessage") {
    messageType = "image"
    // Caption como texto (el cliente puede escribir mientras manda la imagen)
    text = msgObj.imageMessage?.caption ?? null
    imageUrl = msgObj.imageMessage?.url ?? null
    imageBase64 = data?.message?.base64 ?? null
    imageMimetype = msgObj.imageMessage?.mimetype ?? "image/jpeg"
  } else if (rawType === "locationMessage") {
    // Detección de ubicación compartida por WhatsApp
    // Extraemos coordenadas GPS y las codificamos en el texto para persistirlas en historial
    messageType = "location"
    const locMsg = msgObj.locationMessage ?? msgObj
    const lat: number | null = locMsg.degreesLatitude ?? locMsg.latitude ?? null
    const lng: number | null = locMsg.degreesLongitude ?? locMsg.longitude ?? null
    const locName: string | null = locMsg.name ?? locMsg.address ?? null
    // Codificamos coordenadas en el texto para que queden en el ChatHistory
    text = `[UBICACIÓN_ENVIADA:lat=${lat ?? ''},lng=${lng ?? ''},name=${locName ?? ''}]`
    console.log(`[LOGIC_FILTER]: Ubicación de WhatsApp detectada → lat=${lat}, lng=${lng}, name=${locName}`)
  } else {
    // conversation o extendedTextMessage
    text =
      msgObj.conversation ??
      msgObj.extendedTextMessage?.text ??
      null

    if (!text || text.trim() === "") {
      return { valid: false, reason: "EMPTY_TEXT: Mensaje de texto vacío → descartado.", parsed: null }
    }
  }


  // El campo 'sender' en la raíz del webhook es el número del negocio (la org)
  const senderPhone: string | null = raw?.sender
    ? raw.sender.split("@")[0].split(":")[0]
    : null

  // Extraer coordenadas del locationMessage si están disponibles (parsear desde el texto codificado)
  let locationLat: number | null = null
  let locationLng: number | null = null
  let locationNameFinal: string | null = null
  if (messageType === "location" && text) {
    const latMatch = text.match(/lat=([^,\]]+)/)
    const lngMatch = text.match(/lng=([^,\]]+)/)
    const nameMatch = text.match(/name=([^\]]+)/)
    locationLat = latMatch?.[1] ? parseFloat(latMatch[1]) : null
    locationLng = lngMatch?.[1] ? parseFloat(lngMatch[1]) : null
    locationNameFinal = nameMatch?.[1] || null
  }

  return {
    valid: !isSelf, // Si es de nosotros, no es válido para que el agente responda
    reason: isSelf ? "SELF_MSG" : undefined,
    parsed: {
      remoteJid,
      instanceName,
      senderPhone,
      messageType,
      text,
      imageUrl,
      imageBase64,
      imageMimetype,
      fromMe,
      pushName,
      timestamp,
      locationLat,
      locationLng,
      locationName: locationNameFinal,
    },
  }
}
