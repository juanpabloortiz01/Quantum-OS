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

const MENU_LOOKUP_TOOL = {
  type: "function" as const,
  function: {
    name: "buscar_menu",
    description: "Busca únicamente productos, tamaños, ingredientes y precios verificados del menú oficial de este negocio en PostgreSQL. Úsala antes de responder una consulta sobre disponibilidad, un producto concreto, precios, tamaños o antes de añadir un producto a un pedido.",
    parameters: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "Producto, categoría, tamaño o palabras que el cliente mencionó. Conserva nombres relevantes como 'típica', 'calzone' o 'mediana'."
        },
        categoria: {
          type: "string",
          description: "Categoría solicitada si el cliente la mencionó, por ejemplo pizzas, bebidas o acompañamientos."
        }
      },
      required: ["consulta"],
      additionalProperties: false
    }
  }
}

type MenuCatalogItem = {
  nombre?: string
  categoria?: string
  especificacion?: string
  descripcion?: string
  tamanos?: Array<{ nombre?: string; precio?: string | null }>
  precio?: string | null
}

const normalizeMenuText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()

async function buscarMenuEnBaseDeDatos(organizationId: string, consulta: string, categoria?: string) {
  // La consulta llega parametrizada a Prisma; nunca interpolamos texto del cliente en SQL.
  const [businessConfig, products] = await Promise.all([
    prisma.businessConfig.findUnique({
      where: { organizationId },
      select: { config: true }
    }),
    prisma.product.findMany({
      where: { organizationId },
      select: { category: true, brand: true, characteristics: true }
    })
  ])

  const config = (businessConfig?.config ?? {}) as { context?: { menuCatalog?: MenuCatalogItem[] } }
  const extractedCatalog = Array.isArray(config.context?.menuCatalog) ? config.context.menuCatalog : []
  const catalog: MenuCatalogItem[] = extractedCatalog.length > 0
    ? extractedCatalog
    : products.map(product => ({
        nombre: product.category ?? "",
        especificacion: product.characteristics ?? "",
        precio: product.brand ?? null,
      }))

  const ignoredTerms = new Set(["quiero", "una", "uno", "unos", "unas", "el", "la", "los", "las", "de", "del", "con", "para", "por", "favor", "tienen", "tiene", "hay", "me", "dame", "pedir"])
  const queryTerms = normalizeMenuText(consulta)
    .split(/[^a-z0-9]+/)
    .filter(term => term.length > 1 && !ignoredTerms.has(term))
  const categoryTerm = categoria ? normalizeMenuText(categoria) : ""

  const results = catalog
    .map(item => {
      const searchable = normalizeMenuText([
        item.nombre,
        item.categoria,
        item.especificacion,
        item.descripcion,
        ...(item.tamanos ?? []).flatMap(size => [size.nombre, size.precio])
      ].filter(Boolean).join(" "))
      const score = queryTerms.reduce((total, term) => total + (searchable.includes(term) ? 1 : 0), 0)
      const categoryMatches = !categoryTerm || normalizeMenuText(item.categoria ?? "").includes(categoryTerm)
      return { item, score, categoryMatches }
    })
    .filter(({ score, categoryMatches }) => score > 0 && categoryMatches)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ item }) => ({
      nombre: item.nombre ?? "",
      categoria: item.categoria ?? "",
      especificacion: item.especificacion ?? item.descripcion ?? "",
      tamanos: item.tamanos ?? (item.precio ? [{ nombre: "Único", precio: item.precio }] : [])
    }))

  return {
    consulta,
    fuente: extractedCatalog.length > 0 ? "menuCatalog oficial" : "productos registrados",
    productos: results,
    encontrado: results.length > 0,
    mensaje: results.length > 0
      ? "Coincidencias verificadas en PostgreSQL. No inventes datos fuera de estos resultados."
      : "No hay coincidencias verificadas para esta consulta en PostgreSQL."
  }
}

function formatToEcuadorTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const ecuadorDate = new Date(d.getTime() - 5 * 60 * 60 * 1000);
    const year = ecuadorDate.getUTCFullYear();
    const month = String(ecuadorDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(ecuadorDate.getUTCDate()).padStart(2, "0");
    const hours = String(ecuadorDate.getUTCHours()).padStart(2, "0");
    const minutes = String(ecuadorDate.getUTCMinutes()).padStart(2, "0");
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
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const year = ecuadorDate.getUTCFullYear();
  const month = String(ecuadorDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ecuadorDate.getUTCDate()).padStart(2, "0");
  const hours = String(ecuadorDate.getUTCHours()).padStart(2, "0");
  const minutes = String(ecuadorDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(ecuadorDate.getUTCSeconds()).padStart(2, "0");
  const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const weekdayName = weekdays[ecuadorDate.getUTCDay()];
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthName = months[ecuadorDate.getUTCMonth()];

  const next7DaysMap = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ecuadorDate.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    const dDayName = weekdays[d.getUTCDay()];
    const dYyyy = d.getUTCFullYear();
    const dMm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dDd = String(d.getUTCDate()).padStart(2, "0");
    next7DaysMap.push(`- ${dDayName}: ${dYyyy}-${dMm}-${dDd}`);
  }
  const next7DaysStr = next7DaysMap.join("\n");

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
    const order = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];
    const activeDays = order
      .map(day => {
        const config = ctx.scheduleConfig?.[day];
        if (config && config.isOpen) {
          return `- ${dayNamesMap[day]}: Abierto las 24 horas`;
        } else {
          return `- ${dayNamesMap[day]}: CERRADO`;
        }
      });
    scheduleStr = `\n${activeDays.join("\n")}`;
  } else if (ctx.scheduleType === "custom") {
    const order = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];
    const customDays = order
      .map(day => {
        const config = ctx.scheduleConfig?.[day];
        if (config && config.isOpen) {
          return `- ${dayNamesMap[day]}: de ${config.openTime} a ${config.closeTime}`;
        } else {
          return `- ${dayNamesMap[day]}: CERRADO`;
        }
      });
    scheduleStr = `\n${customDays.join("\n")}`;
  } else {
    // Compatibilidad con formato antiguo
    const order = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];
    const mappedDays = order
      .map(day => {
        const isOpen = ctx.scheduleDays.includes(day);
        if (isOpen) {
          return `- ${dayNamesMap[day]}: de ${ctx.openTime} a ${ctx.closeTime}`;
        } else {
          return `- ${dayNamesMap[day]}: CERRADO`;
        }
      });
    scheduleStr = `\n${mappedDays.join("\n")}`;
  }

  // ── Catálogo de productos ─────────────────────────────────────────
  // Si existe un menú estructurado o productos registrados, se formatea un resumen
  // claro y completo en el prompt para que el modelo conozca TODO lo que vende el negocio
  // de inmediato (sin riesgo de alucinar que un producto como "alitas" no existe en pedidos largos),
  // y a la vez puede usar buscar_menu para detalles específicos.
  const hasUploadedMenu = Boolean(ctx.menuPdfUrl || ctx.menuImages?.length)
  let catalogStr = ""
  if (ctx.menuCatalog && ctx.menuCatalog.length > 0) {
    const formattedItems = ctx.menuCatalog.map((item, idx) => {
      const cat = item.categoria ? `[${item.categoria}] ` : ""
      const sizes = item.tamanos?.length
        ? ` (Tamaños/Precios: ${item.tamanos.map(t => `${t.nombre}: $${t.precio}`).join(", ")})`
        : item.precio ? ` (Precio: $${item.precio})` : ""
      const desc = item.especificacion || item.descripcion ? ` - Ingredientes/Detalle: ${item.especificacion || item.descripcion}` : ""
      return `${idx + 1}. ${cat}*${item.nombre}*${sizes}${desc}`
    }).join("\n")

    catalogStr = `📋 MENÚ OFICIAL REGISTRADO:\n${formattedItems}\n\n⚠️ REGLA: Este es el menú 100% verificado del negocio. TODO producto que aparezca en esta lista SÍ EXISTE y está disponible. Si el cliente pide algo que está en esta lista (como alitas, calzone, pizzas, bebidas, etc.), NUNCA digas que no lo tienes. Usa buscar_menu si requieres verificar detalles adicionales.`
  } else if (ctx.products && ctx.products.length > 0) {
    const formattedProducts = ctx.products.map((p, idx) => {
      const cat = p.category ? `[${p.category}] ` : ""
      const price = p.brand ? ` ($${p.brand})` : ""
      const char = p.characteristics ? ` - ${p.characteristics}` : ""
      return `${idx + 1}. ${cat}*${p.category || "Producto"}*${price}${char}`
    }).join("\n")
    catalogStr = `📋 PRODUCTOS REGISTRADOS:\n${formattedProducts}\n\n⚠️ REGLA: Estos son los productos disponibles en la base de datos.`
  } else if (hasUploadedMenu) {
    catalogStr = "Menú cargado en archivo, pero sin catálogo estructurado extraído. Consulta buscar_menu y no inventes platos no confirmados."
  } else {
    catalogStr = "No hay productos o servicios cargados en el sistema."
  }


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
    .filter(Boolean)
    .join("\n")

  let locationRules = ""
  if (ctx.locationConfig) {
    if (!ctx.locationConfig.hasPhysicalLocation) {
      locationRules = `⚠️ IMPORTANTE: Este negocio NO tiene un local físico para recibir clientes. Si el cliente pregunta por la ubicación, dirección o dónde están ubicados, DEBES responder textualmente: "Lo sentimos, pero solo atendemos adomicilio." o "No contamos con local físico, solo realizamos entregas a domicilio."`
    } else {
      locationRules = `📌 UBICACIÓN: Si el cliente pregunta por la ubicación del local, la dirección o cómo llegar, dile que le enviarás el mapa con la ubicación exacta en un momento y DEBES emitir OBLIGATORIAMENTE la etiqueta oculta al final de tu respuesta: ENVIAR_UBICACION:{}`
    }
  }

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
    const tope = ctx.reservationsConfig?.tope_personas_por_hora ?? 25;
    const occupied = ctx.reservationsConfig?.occupiedSlots || {};
    const occupiedList = Object.entries(occupied)
      .map(([datetime, count]) => `- ${datetime.substring(0, 16)}: ${count} personas ocupadas`)
      .join("\n");

    reservationsStr = `\n═══════════════════════════════════════
📅 PROCESO DE RESERVACIONES DE MESAS (ACTIVO)
═══════════════════════════════════════
⚠️ REGLAS OBLIGATORIAS DE RESERVAS (FLUJO PASO A PASO ESTRICTO):

PASO 1: RECOLECCIÓN Y VALIDACIÓN BÁSICA (CRÍTICO)
Pregunta y confirma de manera explícita:
- El nombre completo de la persona que reserva.
- La cantidad de personas.
- La fecha y hora exacta deseada para la reserva.
IMPORTANTE - MAPEO DE FECHAS: HOY es ${weekdayName} ${year}-${month}-${day}. Usa el siguiente calendario estricto para traducir los días de la semana que pide el cliente a fechas exactas:
${next7DaysStr}

REGLAS PARA VALIDACIÓN DE HORARIOS (SÚPER ESTRICTAS):
1. Cuando el cliente solicite una fecha (por ejemplo: "hoy", "mañana", "el jueves", "15 de julio"):
   - Tradúcela a una fecha calendario (AAAA-MM-DD) usando el MAPEO DE FECHAS de arriba.
   - Determina el día de la semana correspondiente a esa fecha (ej: "Miércoles").
2. Identifica el horario de atención para ese día de la semana específico en la REGLA DE HORARIO:
   ${scheduleStr}
   - Si dice que está CERRADO para ese día, rechaza la reserva inmediatamente y dile amablemente el horario real de atención.
3. Si el día está abierto, extrae las horas de apertura y cierre (ej: de 09:00 a 18:00).
4. Convierte la hora solicitada por el cliente (ej: "3pm", "3 de la tarde", "15:00") a formato 24 horas.
   - Ejemplo: "3pm" es 15:00.
   - Ejemplo: "12pm" es 12:00 (mediodía).
   - Ejemplo: "12am" es 00:00 (medianoche).
   - Ejemplo: "1pm" es 13:00.
   - Ejemplo: "1:30pm" es 13:30.
5. Compara la hora solicitada con la hora de apertura y de cierre de ese día:
   - La reserva es VÁLIDA si y solo si la hora solicitada está entre la hora de apertura y de cierre del local (inclusive).
   - Si la hora solicitada está fuera del horario de atención, recházala de inmediato amablemente, dile el horario de atención de ese día y pídele otra hora.
   - Si la hora solicitada es válida (está dentro del horario de atención), avanza al PASO 2.
     (CRÍTICO: Si la hora es válida, NO des explicaciones innecesarias sobre el horario del local. No digas "es válida porque cerramos a las X". Simplemente dile que está libre o disponible).

PASO 2: VALIDACIÓN DE CAPACIDAD (Aforo)
Capacidad Máxima por hora permitida: ${tope} personas.
Las reservas confirmadas actualmente para los próximos 7 días son:
${occupiedList || "No hay reservas previas."}

REGLAS DE AFORO:
IMPORTANTE: NUNCA le menciones al cliente cuál es la capacidad máxima por hora ni la uses en tus justificaciones. Ese es un dato estrictamente interno. Si no hay espacio, simplemente dile que esa hora está ocupada.
1. Si la "cantidad de personas" que pide el cliente es MAYOR estrictamente a la Capacidad Máxima (${tope}), entonces NO puedes agendar de forma automática. Antes de generar la etiqueta RESERVA_EXCEDE_LIMITE, asegúrate de tener el nombre del cliente. Una vez tengas el nombre y la cantidad, DEBES escalar al soporte usando la etiqueta RESERVA_EXCEDE_LIMITE, y decirle al cliente: "Al ser una reservación para tantas personas te pasaré con un encargado para que te atienda." y detente ahí.
2. Si la suma de las personas que el cliente pide MÁS las personas ya ocupadas en la fecha y hora exacta deseada es MAYOR a la Capacidad Máxima (${tope}), entonces la hora está saturada. DEBES disculparte y sugerir proactivamente otras horas cercanas en ese mismo día que SÍ tengan capacidad suficiente. NO pidas el pedido de comida todavía, debes acordar una hora disponible primero.
3. Si hay espacio suficiente, avanza al paso de la comida.

PASO 3: TOMAR EL PEDIDO DE COMIDA (CRÍTICO)
Una vez confirmados el nombre, personas, fecha y hora (y validado el aforo), **NO** generes la reserva todavía. 
Dile al cliente: "¡Perfecto! Tengo listos tus datos para la mesa. Ahora necesito tomar tu pedido. ¿Ya sabes lo que deseas ordenar o te envío el menú?"
- Si el cliente responde afirmativamente a ver el menú, usa la opción normal de enviar menú visualmente (opción 4 / ver el menú).
- Cuando el cliente indique sus platos, recoge el pedido con la cantidad exacta de cada uno (ej. "2 hamburguesas clasicas, 1 bebida").
- Envíale un resumen del pedido de comida junto a los datos de la reserva y pídele que responda "CONFIRMAR" para finalizar la reserva en firme.

PASO 4: CONFIRMACIÓN Y ETIQUETA FINAL
Solo cuando el cliente haya confirmado explícitamente el resumen de su pedido y datos (ej. "Sí", "Confirmar", "Correcto"), DEBES emitir OBLIGATORIAMENTE la etiqueta oculta al final de tu respuesta:
SOLICITAR_RESERVA:{"cliente_nombre": "Nombre del Cliente", "cantidad_personas": Número, "fecha_hora_deseada": "YYYY-MM-DDTHH:MM:SS", "pedido": "Detalle completo del pedido, organizado punto por punto"}

Ejemplos de etiquetas de salida:
A) Todo validado y confirmado por el cliente:
SOLICITAR_RESERVA:{"cliente_nombre": "Juan Perez", "cantidad_personas": 2, "fecha_hora_deseada": "${year}-${month}-${String(parseInt(day)+1).padStart(2,"0")}T15:00:00", "pedido": "1x Pizza Familiar\n2x Gaseosas"}

B) El grupo excede la capacidad global del restaurante (${tope} personas):
RESERVA_EXCEDE_LIMITE:{"cliente_nombre": "Juan Perez", "cantidad_personas": 50, "fecha_hora_deseada": "${year}-${month}-${String(parseInt(day)+1).padStart(2,"0")}T15:00:00", "pedido": ""}
`
  }

  let activeReservaStr = ""
  if (activeReserva) {
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

Si el cliente acepta esta nueva hora/fecha propuesta o expresa conformidad (ej: "sí", "está bien", "dale", "acepto", "perfecto"), DEBES confirmar la reserva en este nuevo horario y DEBES emitir OBLIGATORIAMENTE la etiqueta oculta al final de tu respuesta (manteniendo el pedido original si aplicaba):
SOLICITAR_RESERVA:{"cliente_nombre": "${activeReserva.cliente_nombre}", "cantidad_personas": ${activeReserva.cantidad_personas}, "fecha_hora_deseada": "${activeReserva.propuesta_alternativa.toISOString().split('.')[0]}", "pedido": "${activeReserva.pedido || ''}"}
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
  const transferStr = ctx.transferEnabled && ctx.transferDetails.trim()
    ? `CAPACIDAD DE PAGOS POR TRANSFERENCIA ACTIVADA:\nSi el cliente solicita datos bancarios, número de cuenta o desea pagar mediante transferencia, entrégale de forma clara y directa la siguiente información:\n${ctx.transferDetails}`
    : "CAPACIDAD DE TRANSFERENCIAS DESACTIVADA: No ofrezcas ni entregues datos bancarios ni confirmes que se puede pagar por transferencia. Si preguntan, indica que deben consultar con el negocio."

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
Solo cuando el cliente ha solicitado agendar y ha confirmado los 5 elementos clave:
- SERVICIO, FECHA, HORA, NOMBRE COMPLETO y CÉDULA DE IDENTIDAD.
Si falta cualquiera de estos, pídela con amabilidad.

CONVERSIÓN DE HORAS — CRÍTICO: El cliente puede indicar la hora en formato de 12 horas (AM/PM). Debes convertirla SIEMPRE a formato de 24 horas:
- "3pm" → 15:00  |  "3am" → 03:00  |  "12pm" → 12:00  |  "12am" → 00:00
- "1pm" → 13:00  |  "6pm" → 18:00  |  "8pm" → 20:00
El campo "time" del tag AGENDAR_CITA siempre debe tener formato HH:MM (00-23).

Cuando el cliente haya confirmado los 5 datos, tu respuesta DEBE incluir al final la etiqueta EXACTA:
AGENDAR_CITA:{"service": "Nombre del Servicio", "date": "YYYY-MM-DD", "time": "HH:MM", "customerName": "Nombre Apellido", "cedula": "1234567890"}

REGLAS DE DISPONIBILIDAD:
- Horario: ${scheduleStr}
- Ocupado actualmente:
${ctx.calendarAvailability && ctx.calendarAvailability.length > 0
    ? ctx.calendarAvailability.map(s => `- De ${formatToEcuadorTime(s.start)} a ${formatToEcuadorTime(s.end)}`).join("\n")
    : "Sin reservaciones previas."}
- Duración: 60 min por cita.
CRÍTICO: Al confirmar disponibilidad a un cliente, SÉ DIRECTO y NUNCA des detalles innecesarios sobre el horario general del local o por qué es válida (ej. no digas "ya que estamos abiertos hasta las X"). Simplemente confirma si la hora solicitada está libre o no.`;

  const generalRules = hasReservations ? `
OPCIÓN 1 — HACER UN PEDIDO (A DOMICILIO O PARA LLEVAR):
Sigue este protocolo estricto de recolección y razonamiento:
1. VALIDACIÓN Y ESPECIFICACIÓN DEL PRODUCTO (Prioridad Máxima para cocina):
   - Verifica si el plato o pizza solicitado existe en el CONOCIMIENTO BASE / MENÚ.
   - Si NO existe: Niégalo educadamente sin inventar: "Lo siento, no contamos con [plato] en nuestro menú. Nuestras opciones disponibles son: [mencionar 2 o 3 opciones del menú]."
   - Si EXISTE pero faltan datos esenciales (TAMAÑO, CANTIDAD o INGREDIENTES/especificaciones): Pregunta exactamente lo que falta antes de avanzar. NUNCA pidas dirección ni nombre hasta tener el plato completamente especificado.
2. BEBIDAS Y ACOMPAÑAMIENTOS: Sugiere amablemente si desea agregar bebidas o complementos del menú.
3. DATOS DE ENTREGA: Solicita nombre completo y dirección exacta con referencias (o si retira en el local).
4. MÉTODO DE PAGO:
   - Inmediatamente después de recibir la dirección de entrega (o confirmación de retiro), debes preguntar: "¿Deseas realizar tu pago en efectivo o por transferencia bancaria?"
5. RESUMEN Y CONFIRMACIÓN SEGÚN EL MÉTODO DE PAGO:
   - SI ELIGE EFECTIVO:
     Presenta el resumen del pedido (platos, cantidades, nombre, dirección y *TOTAL: [monto]*), indicando claramente el método de pago: "*Pago:* Efectivo". Pide al cliente: "Por favor responde *CONFIRMAR* para enviar tu orden a preparación."
     Cuando el cliente responda "CONFIRMAR" (o exprese confirmación clara), emite de inmediato:
     PEDIDO_CONFIRMADO:{"plato":"[detalle de los ítems]","nombre":"[nombre]","direccion":"[dirección]","total":"[monto]","metodo_pago":"Efectivo"}.
   - SI ELIGE TRANSFERENCIA:
     ${ctx.transferEnabled && ctx.transferDetails.trim()
       ? `Presenta el resumen con *TOTAL: [monto]* y "*Pago:* Transferencia", envía los datos bancarios configurados y solicita: "Por favor envía una captura o la imagen de tu comprobante para poder enviar tu orden a preparación." Emite:
     PEDIDO_PENDIENTE_COMPROBANTE:{"plato":"[detalle de los ítems]","nombre":"[nombre]","direccion":"[dirección]","total":"[monto]","metodo_pago":"Transferencia"}. No emitas PEDIDO_CONFIRMADO todavía; el sistema confirmará y reenviará todo al encargado automáticamente al recibir la imagen del comprobante.`
       : `Indica que actualmente no se encuentran habilitadas las transferencias o consulta con el negocio, y ofrece pagar en efectivo.`}

OPCIÓN 2 — RESERVAR UNA MESA (CONSUMO EN EL LOCAL):
Sigue estricta y cronológicamente el protocolo de RESERVACIONES (Paso 1: Datos, Paso 2: Pedido de comida para la mesa, Paso 3: Confirmación). 
CRÍTICO: Si el cliente está reservando una mesa y pide comida, ES UN PEDIDO PARA SU RESERVA, NO ES UN PEDIDO A DOMICILIO. Solo genera la etiqueta SOLICITAR_RESERVA en el último paso, con los platos dentro del campo "pedido". NUNCA uses PEDIDO_CONFIRMADO cuando el cliente quiere ir a comer al local.` : `
OPCIÓN 1 — TOMAR UN PEDIDO:
Sigue este protocolo estricto de recolección y razonamiento de prioridades:

PASO 1 — VALIDACIÓN Y ESPECIFICACIÓN DEL PRODUCTO (Prioridad Máxima para cocina):
- Revisa obligatoriamente el CONOCIMIENTO BASE / MENÚ:
  * Si el cliente pide algo que NO está en el menú (ej: una pizza o plato que no vendes): dile con amabilidad: "Lo siento, no contamos con [producto] en nuestro menú. Nuestras opciones disponibles son: [mencionar 2 o 3 opciones reales del menú] o si gustas te comparto la carta completa." NUNCA inventes platos ni aceptes pedidos de cosas inexistentes.
  * Si el plato SÍ está en el menú, confirma los ingredientes y razona qué datos esenciales faltan para la orden:
    - ¿Falta el TAMAÑO? (Personal, Mediana, Familiar, etc.). Si el menú maneja tamaños y no lo dijo, pregúntaselo.
    - ¿Faltan INGREDIENTES / ESPECIFICACIONES? Si pidió solo por nombre y tamaño arbitrario, confirma qué ingredientes lleva según el menú y pregunta si desea alguna especificación (ej: "¿Deseas agregar algún ingrediente extra o alguna indicación para la cocina?").
    - ¿Falta la CANTIDAD? Pregunta cuántas unidades desea.
⚠️ REGLA DE ORO: NUNCA pidas la dirección ni el nombre del cliente hasta que todos los platos/pizzas estén 100% claros en tamaño, cantidad e ingredientes.

PASO 2 — BEBIDAS Y ACOMPAÑAMIENTOS (Venta cruzada):
Pregunta amablemente si desea añadir alguna bebida o adicional disponible en el menú a su orden.

PASO 3 — DATOS DE ENTREGA:
Una vez definida la comida y bebidas, solicita:
- Nombre completo de quien recibe.
- Dirección exacta de entrega con referencias (o confirma si pasa retirando por el local).

PASO 4 — MÉTODO DE PAGO:
Inmediatamente después de recibir la dirección de entrega (o confirmación de retiro), debes preguntar:
"¿Deseas realizar tu pago en efectivo o por transferencia bancaria?"

PASO 5 — RESUMEN TOTAL Y CONFIRMACIÓN SEGÚN MÉTODO DE PAGO:
Presenta un resumen claro con:
- Ítems detallados (platos, tamaño, cantidad, especificaciones de ingredientes).
- Bebidas/adicionales.
- Valor total del pedido en una línea separada y en negrita: *TOTAL: [monto]*. Calcula con precios y cantidades confirmados del menú; no inventes el total si falta información.
- Dirección o modalidad de retiro.
- Método de pago especificado.

* Si el cliente elige EFECTIVO:
  Incluye en el resumen: "*Pago:* Efectivo" y solicita: "Por favor responde *CONFIRMAR* para enviar tu orden a preparación."
  Al recibir la confirmación explícita del cliente ("CONFIRMAR", "Sí", etc.), emite de inmediato:
  PEDIDO_CONFIRMADO:{"plato":"[detalle de los ítems]","nombre":"[nombre]","direccion":"[dirección]","total":"[monto]","metodo_pago":"Efectivo"}.

* Si el cliente elige TRANSFERENCIA:
  ${ctx.transferEnabled && ctx.transferDetails.trim()
    ? `Incluye en el resumen: "*Pago:* Transferencia", entrega los datos bancarios y termina con: "Por favor envía una captura o la imagen de tu comprobante para poder enviar tu orden a preparación." Emite:
  PEDIDO_PENDIENTE_COMPROBANTE:{"plato":"[detalle de los ítems]","nombre":"[nombre]","direccion":"[dirección]","total":"[monto]","metodo_pago":"Transferencia"}. No emitas PEDIDO_CONFIRMADO todavía; el sistema lo confirmará automáticamente cuando el cliente envíe la imagen del comprobante.`
    : `Indica que actualmente las transferencias no están disponibles y ofrece abonar en efectivo.`}`;

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

OPCIÓN ${isAgenda ? "2" : (hasReservations ? "4" : "3")} — VER ${isAgenda ? "SERVICIOS" : "MENÚ / CARTA"}:
${ctx.menuPdfUrl
  ? `📄 PROTOCOLO DE MENÚ EN PDF (OBLIGATORIO):
Este negocio dispone de su menú/carta en formato PDF (${ctx.menuPdfUrl}).
Cuando el cliente seleccione esta opción (${isAgenda ? "2" : (hasReservations ? "4" : "3")}) o solicite ver el menú, la carta, los platos o precios (ej: "menú", "carta", "pásame el menú", "tienen carta?", "qué tienen para comer", etc.):
DEBES responder ÚNICAMENTE: "¡Claro! Aquí tienes nuestro menú digital 📄" y DEBES agregar obligatoriamente al final de tu respuesta la etiqueta con la URL exacta del PDF:
FOTO_URL:${ctx.menuPdfUrl}
IMPORTANTE: NO escribas la URL en el cuerpo de tu texto (ej: no digas "descárgalo aquí"), ya que nuestro sistema se encarga de enviar el documento PDF adjunto automáticamente por WhatsApp. No agregues disculpas, advertencias de falta de acceso al menú, enlaces, explicaciones ni invitaciones adicionales a pedir.`
  : (ctx.menuImages && ctx.menuImages.length > 0)
  ? `🖼️ PROTOCOLO DE MENÚ EN IMÁGENES:
Responde indicando únicamente la frase "Claro! Aquí tienes nuestro menú" y DEBES agregar obligatoriamente al final de tu respuesta una etiqueta FOTO_URL por cada una de las imágenes disponibles en esta lista exacta de URLs (emite una etiqueta FOTO_URL por línea en orden):\n${ctx.menuImages.map(url => `FOTO_URL:${url}`).join("\n")}`
  : "Lista los productos/servicios disponibles de forma organizada y detallada."
}

OPCIÓN ${isAgenda ? "3" : (hasReservations ? "5" : "4")} — INFORMACIÓN:
Dirección: ${ctx.address || "No especificada"}
Horarios: ${scheduleStr}
${contactParts}
${transferStr}
${locationRules}
${loyaltyStr}
${reservationsStr}
${activeReservaStr}

═══════════════════════════════════════
CONOCIMIENTO BASE
═══════════════════════════════════════
${catalogStr}

═══════════════════════════════════════
⚠️ REGLAS DE ORO (VERACIDAD Y CONTROL)
═══════════════════════════════════════
- USO DE HERRAMIENTA Y MENÚ: Ante cualquier solicitud de un producto, disponibilidad, precio, tamaño o ingrediente, cuentas con el MENÚ OFICIAL en tu CONOCIMIENTO BASE y la herramienta buscar_menu para profundizar. Si un producto está en el MENÚ OFICIAL (por ejemplo alitas, pizzas, bebidas, entradas), SÍ existe y debes tomarlo en cuenta. Nunca niegues un producto que figure en tu CONOCIMIENTO BASE ni inventes productos que no figuren en él.
- PEDIDO — RESPUESTAS SIN REPETICIONES: Cuando ya se hayan confirmado productos, tamaños y cantidades, no los repitas ni digas frases como "Has elegido..." al pedir el siguiente dato. Pide solamente el dato que falte, de manera breve.
- UBICACIÓN COMPARTIDA COMO DIRECCIÓN VÁLIDA: El texto \`[UBICACIÓN_ENVIADA:lat=...,lng=...,name=...]\` significa que el cliente compartió su ubicación por WhatsApp. Es una dirección de entrega VÁLIDA y suficiente: nunca vuelvas a pedir dirección escrita, exacta, referencias ni confirmación de dirección. Conserva \`direccion\` como "Ubicación compartida por WhatsApp" en la etiqueta de pedido; el sistema reenvía el mapa y sus coordenadas al encargado. Si ya tienes los productos y el nombre del cliente, al recibir esta ubicación DEBES preguntar el método de pago: "¿Deseas realizar tu pago en efectivo o por transferencia bancaria?" NO envíes aún los datos bancarios ni emitas \`PEDIDO_PENDIENTE_COMPROBANTE\` ni \`PEDIDO_CONFIRMADO\` hasta que defina el método de pago y confirme el pedido.
- COMPROBANTE SOLO DESPUÉS DEL PAGO PENDIENTE: No digas que recibiste un comprobante, que el pedido está confirmado ni que está en preparación solo porque el cliente envió una imagen. Eso ocurre automáticamente únicamente cuando existe en el historial la etiqueta \`PEDIDO_PENDIENTE_COMPROBANTE\`, generada cuando el cliente seleccionó transferencia bancaria. Si no existe esa etiqueta, informa brevemente que primero debe seleccionar el método de pago y confirmar el pedido.
- CERO PEDIDOS FANTASMA: Antes de emitir PEDIDO_CONFIRMADO o PEDIDO_PENDIENTE_COMPROBANTE, o de enviar una orden/notificación a recepción o cocina, es OBLIGATORIO contar con el nombre completo y una dirección de entrega válida (dirección escrita, ubicación compartida por WhatsApp o modalidad de retiro confirmada). Nunca uses "No especificado", texto de ejemplo ni valores vacíos en los campos \`nombre\` o \`direccion\`. Si falta cualquiera de estos datos, no emitas la etiqueta de pedido: solicítalo al cliente y espera su respuesta.
- PEDIDOS MULTICATEGORÍA — REVISIÓN COMPLETA: Cuando el cliente pida productos de distintas categorías en un mismo mensaje (por ejemplo pizzas, lasañas, hamburguesas, bebidas o acompañamientos), desglosa cada ítem por separado con su cantidad, tamaño y especificaciones. Conserva TODOS los ítems durante la conversación, revísalos uno por uno antes de calcular el total y muéstralos completos en el resumen final. No cierres ni confirmes un pedido hasta comprobar que no se omitieron bebidas, acompañamientos ni productos de otra categoría.
- VALIDACIÓN ESTRICTA DEL MENÚ: Antes de decir que un producto no existe, consulta y revisa todo el CONOCIMIENTO BASE / MENÚ, incluidos sus nombres, categorías, tamaños y variantes disponibles. Nunca declares inexistente un producto oficial que figure en el catálogo (por ejemplo, Calzone). Solo comunica que no está disponible después de verificar que no aparece en el catálogo actual; si hay ambigüedad de nombre, pide aclaración o ofrece las coincidencias del menú.
- VERACIDAD DEL MENÚ (FUENTE EXCLUSIVA): Si hay un catálogo extraído del menú, úsalo como única fuente para productos, ingredientes, opciones, precios y recomendaciones. No uses conocimiento general ni otros productos cargados para completar esos datos. Recomienda únicamente ítems y combinaciones expresamente presentes en el menú. Si el menú no especifica un dato, di que no aparece y ofrece confirmar con el negocio. Si el catálogo extraído está vacío, no inventes ni aceptes pedidos de productos; indica que no puedes verificar el menú.
- TAMAÑOS Y PRECIOS: Cada precio pertenece únicamente al tamaño de la misma entrada en "Tamaños y precios asociados". No uses un precio de otro tamaño ni presentes el primer precio como precio único. Si el cliente no indicó tamaño, pregunta cuál desea cuando el menú ofrezca varios; confirma el precio correspondiente antes de cerrar el pedido.
- PROMOCIONES Y COMBOS (REGLA OBLIGATORIA): Cuando el cliente pida un producto de la categoría PROMOCIONES (por ejemplo COMBO GIGANTE, COMBO FAMILIAR, ALL DAY 2 PIZZA, PROMO 2X1, COMBO DELUXE, COMBO FIESTA, COMBO ESTUDIANTIL, COMBO FIORE, etc.), DEBES seguir este protocolo estricto antes de avanzar al siguiente paso:
  1. SABOR DE PIZZA: Toda promoción que incluya pizzas requiere que el cliente elija el sabor o tipo de pizza. Si la promo incluye 2 pizzas, pregunta el sabor de cada una por separado (ej: "¿Cuál sería el sabor de la pizza 1? ¿Y el sabor de la pizza 2?"). NUNCA asumas o inventes un sabor.
  2. INGREDIENTES A ELECCIÓN: Si la promo especifica "X ingredientes a elección" (ej: COMBO GIGANTE incluye 3 ingredientes, COMBO FIESTA y COMBO ESTUDIANTIL incluyen 2 ingredientes), DEBES preguntar explícitamente cuáles son esos ingredientes. No avances sin tener todos los ingredientes confirmados.
  3. SALSAS: Si la promo incluye salsas a escoger (ej: COMBO FIESTA y COMBO ESTUDIANTIL ofrecen 2 salsas entre BBQ, Mostaza y miel, Picante), DEBES preguntar cuáles 2 salsas desea el cliente.
  4. TAMAÑO EN PROMO 2X1: La PROMO 2X1 tiene distintos precios por tamaño (Pequeña, Mediana, Familiar, Gigante). Si el cliente pide esta promo sin indicar tamaño, pregunta cuál tamaño desea antes de cualquier otra cosa.
  5. RESUMEN COMPLETO DE PROMO: Al confirmar el pedido, el resumen debe detallar todo lo incluido en la promo: nombre de la promo, sabores de cada pizza, ingredientes elegidos, salsas elegidas (si aplica), precio total de la promo y cualquier adicional.
  ⚠️ NUNCA confirmes una promoción que incluya pizzas sin haber recolectado el sabor de CADA pizza incluida en ella. Si el cliente dice "sorpresa" o se niega a elegir sabor, escala a soporte con ESCALADO_SOPORTE para que el encargado coordine con cocina.
- REGLA DE SALIDA DE EMERGENCIA (CAMBIOS ESPECIALES): Si el cliente solicita una modificación específica del plato cuya posibilidad no está confirmada explícitamente por el menú o las reglas del negocio (por ejemplo, doble tocino, sin queso o más salsa), NUNCA digas que no se puede ni confirmes que sí se puede. Responde exactamente: "Déjame confirmar un segundo con cocina si te pueden armar ese cambio especial y te confirmo de inmediato". En el mismo turno, escala a soporte humano agregando al final ESCALADO_SOPORTE:{"nombre":"[nombre del cliente o No especificado]"}. No marques el pedido como confirmado hasta recibir confirmación humana.
- DESCRIPCIONES: Solo afirma ingredientes, tamaños o características que aparezcan en el catálogo. No infieras ingredientes por el nombre del plato.
- CONSULTA SOBRE LO QUE NO SABES: Si el cliente pregunta algo que NO está en el CONOCIMIENTO BASE o en las reglas del negocio, di: "Lo lamento, no tengo esa información específica. Pero si gustas, puedo ponerte en contacto con la recepción para que te ayuden."
- ESCALADO: Si detectas frustración o peticiones repetidas de información que no conoces, usa el protocolo de ESCALADO_SOPORTE.
- BREVEDAD: Máximo 2 párrafos.
- TEXTO CONVERSACIONAL OBLIGATORIO: NUNCA respondas únicamente con etiquetas (como SOLICITAR_RESERVA:, [USER_NAME:], [SUMMARY:], etc.). Siempre debes redactar un mensaje conversacional, amable y completo dirigido al cliente en español, y colocar las etiquetas al final del mensaje.
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
  pedidoData: { plato: string; nombre: string; direccion: string; total?: string; metodo_pago?: string } | null
  isPedidoPendienteComprobante: boolean
  pedidoPendienteData: { plato: string; nombre: string; direccion: string; total: string; metodo_pago?: string } | null
  isPagoSolicitado: boolean
  agendarCita: { service: string; date: string; time: string; customerName: string; cedula: string } | null
  isEscaladoSoporte: boolean
  escalationData: { nombre: string } | null
  solicitarReserva: { cliente_nombre: string; cantidad_personas: number; fecha_hora_deseada: string; pedido?: string } | null
  reservaExcedeLimite: { cliente_nombre: string; cantidad_personas: number; fecha_hora_deseada: string; pedido?: string } | null
  enviarUbicacion: boolean

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
      // La URL de WhatsApp/Evolution suele requerir autenticación y OpenAI no puede
      // descargarla (403). El comprobante se recupera y reenvía por el pipeline,
      // nunca se procesa desde esta URL temporal en el Core.
      userContent.push({
        type: "text",
        text: "(El cliente envió una imagen protegida que no está disponible para análisis visual.)",
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

  const completionMessages: any[] = [
    { role: "system", content: buildSystemPrompt(ctx, sentryResult, history.length === 0, activeReserva) },
    ...historyMessages,
    { role: "user", content: userContent },
  ]
  const debeConsultarMenu = Boolean(ctx.menuCatalog?.length || ctx.products.length) &&
    (sentryResult.needs_inventory || sentryResult.intent === "VENTAS" || sentryResult.intent === "CONSULTA_PRODUCTO")

  let completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: completionMessages,
    tools: [MENU_LOOKUP_TOOL],
    // Para una intención de venta o consulta el primer paso siempre es consultar PostgreSQL.
    tool_choice: debeConsultarMenu ? { type: "function", function: { name: "buscar_menu" } } : "auto",
    parallel_tool_calls: true,
    max_tokens: 600,
    temperature: 0.7,
  })

  let tokensUsed = completion.usage?.total_tokens ?? 0

  // Permite hasta 3 rondas de búsqueda para cubrir pedidos con múltiples platos,
  // acompañamientos (alitas, calzones) y bebidas antes de la redacción final.
  for (let lookupRound = 0; lookupRound < 3; lookupRound++) {
    const assistantMessage = completion.choices[0]?.message
    const toolCalls = assistantMessage?.tool_calls ?? []
    if (toolCalls.length === 0 || !assistantMessage) break

    completionMessages.push(assistantMessage)
    let executedLookup = false
    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function" || toolCall.function.name !== "buscar_menu") continue
      executedLookup = true
      let args: { consulta?: string; categoria?: string } = {}
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        // El modelo recibió el esquema; si no devuelve JSON válido, evitamos una consulta ambigua.
      }

      const consulta = args.consulta?.trim()
      const result = consulta
        ? await buscarMenuEnBaseDeDatos(ctx.organizationId, consulta, args.categoria?.trim())
        : { encontrado: false, productos: [], mensaje: "La consulta no incluyó un producto o término válido." }

      completionMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }

    if (!executedLookup) break

    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: completionMessages,
      tools: [MENU_LOOKUP_TOOL],
      tool_choice: "auto",
      parallel_tool_calls: true,
      max_tokens: 600,
      temperature: 0.7,
    })
    tokensUsed += completion.usage?.total_tokens ?? 0
  }

  // Si tras resolver las tools el modelo no emitió texto final o sigue con llamadas a tools,
  // forzamos la redacción final de la respuesta con tool_choice: "none".
  const lastMsg = completion.choices[0]?.message
  if (!lastMsg?.content?.trim() && lastMsg?.tool_calls?.length) {
    completionMessages.push(lastMsg)
    // Resolver cualquier tool_call restante pendiente con un payload vacío para evitar error de API
    for (const pendingTool of lastMsg.tool_calls) {
      completionMessages.push({
        role: "tool",
        tool_call_id: pendingTool.id,
        content: JSON.stringify({ encontrado: false, mensaje: "Búsqueda finalizada." })
      })
    }

    const finalCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: completionMessages,
      tools: [MENU_LOOKUP_TOOL],
      tool_choice: "none",
      max_tokens: 600,
      temperature: 0.7,
    })
    tokensUsed += finalCompletion.usage?.total_tokens ?? 0
    completion = finalCompletion
  }

  let rawResponse = completion.choices[0]?.message?.content ?? ""

  // Si por alguna razón extrema el modelo devuelve texto vacío, usamos un fallback conversacional seguro
  if (!rawResponse.trim()) {
    console.warn("[CORE_WARN]: rawResponse vacía de OpenAI. Aplicando fallback de cortesía.")
    rawResponse = `¡Hola! Con gusto te ayudo con tu pedido en *${ctx.companyName}*. ¿Podrías indicarme qué producto o pizza te gustaría ordenar para verificarlo de inmediato? [SUMMARY: Consulta de pedido]`
  }

  // ── 4. Parsear etiquetas de control ──────────────────────────────
  const fotoMatches = Array.from(rawResponse.matchAll(/(?:FOTO_URL|DOCUMENTO_URL|PDF_URL):\s*(https?:\/\/[^\s\)\>]+)/gi))
  let imageUrls = fotoMatches.map(m => m[1].trim().replace(/[\.\,\)\>]+$/, ""))

  // ── 4.1. Garantía de entrega de Menú (PDF o Imágenes) ─────────────
  // Si el cliente pide el menú o selecciona la opción correspondiente, y el modelo
  // olvidó incluir la etiqueta, inyectamos el PDF o imágenes automáticamente.
  const isAgenda = ctx.niche.toUpperCase() === "AGENDA"
  const hasReservations = ctx.enabledNodes.includes("reservations")
  const userText = (msg.text || "").toLowerCase().trim()
  const isMenuOptionNumber = (hasReservations && userText === "4") || 
                             (!hasReservations && !isAgenda && userText === "3") || 
                             (isAgenda && userText === "2")
  const isAskingForMenu = isMenuOptionNumber || 
    /\b(men[uú]|carta|platillos?|platos?|precios?)\b/i.test(userText) ||
    /p[aá]same el men[uú]|tienen men[uú]|ver el men[uú]|ver la carta|enviar el men[uú]|env[ií]ame el men[uú]|cu[aá]l es el men[uú]|tienen carta/i.test(userText) ||
    /aqu[íi] (tienes|est[aá]|te comparto|te adjunto) (nuestro|el) men[uú]/i.test(rawResponse)

  if (imageUrls.length === 0 && isAskingForMenu) {
    if (ctx.menuPdfUrl) {
      console.log(`[CORE]: Auto-adjuntando menú PDF a la respuesta -> ${ctx.menuPdfUrl}`)
      imageUrls.push(ctx.menuPdfUrl)
    } else if (ctx.menuImages && ctx.menuImages.length > 0) {
      console.log(`[CORE]: Auto-adjuntando imágenes de menú a la respuesta (${ctx.menuImages.length})`)
      imageUrls.push(...ctx.menuImages)
    }
  }

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

  const pedidoPendienteMatch = rawResponse.match(/PEDIDO_PENDIENTE_COMPROBANTE:(\{[^\n]+\})/i)
  const isPedidoPendienteComprobante = Boolean(pedidoPendienteMatch)
  let pedidoPendienteData = null
  if (pedidoPendienteMatch) {
    try {
      pedidoPendienteData = JSON.parse(pedidoPendienteMatch[1])
    } catch {
      console.error("[CORE_PARSE_ERROR]: Error al parsear pedido pendiente de comprobante")
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

  // Parsear RESERVA_EXCEDE_LIMITE
  let reservaExcedeLimite = null
  const excedeMatch = rawResponse.match(/RESERVA_EXCEDE_LIMITE:\s*([\s\S]+)/i)
  if (excedeMatch) {
    const content = excedeMatch[1].trim()
    const startIdx = content.indexOf("{")
    const endIdx = content.lastIndexOf("}")
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = content.substring(startIdx, endIdx + 1)
      try {
        reservaExcedeLimite = JSON.parse(jsonStr)
      } catch (e) {
        console.error("[CORE_PARSE_ERROR]: Error al parsear JSON de reserva excede limite", jsonStr, e)
      }
    }
  }

  // UBICACIÓN
  let enviarUbicacion = false
  if (rawResponse.includes("ENVIAR_UBICACION:{}")) {
    enviarUbicacion = true
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
    .replace(/PEDIDO_PENDIENTE_COMPROBANTE:\{[^\n]+\}/gi, "")
    .replace(/PAGO_SOLICITADO:/gi, "")
    .replace(/AGENDAR_CITA:({.+})/gi, "")
    .replace(/AGENDAR_CITA:[^.\n]+/gi, "") // Limpiar formato de texto también
    .replace(/ESCALADO_SOPORTE:({.+})/gi, "")
    .replace(/SOLICITAR_RESERVA:\s*({[\s\S]+?})/gi, "")
    .replace(/SOLICITAR_RESERVA:\s*```json[\s\S]+?```/gi, "")
    .replace(/SOLICITAR_RESERVA:\s*```[\s\S]+?```/gi, "")
    .replace(/RESERVA_EXCEDE_LIMITE:\s*({[\s\S]+?})/gi, "")
    .replace(/RESERVA_EXCEDE_LIMITE:\s*```json[\s\S]+?```/gi, "")
    .replace(/RESERVA_EXCEDE_LIMITE:\s*```[\s\S]+?```/gi, "")
    .replace(/ENVIAR_UBICACION:\{\}/gi, "")
    .replace(/\[USER_NAME:\s*(.+?)\]/gi, "")
    .replace(/\[SUMMARY:\s*(.+?)\]/gi, "")
    .replace(/^(MENSAJE|CONFIRMACION|PEDIDO):/gi, "")
    // Limpiar prefijos de intención
    .replace(/^(MENSAJE|CONFIRMACION|PEDIDO)\s+/gi, "") // Limpiar palabras sueltas al inicio

  // Limpiar cualquier URL del menú que haya podido quedar en el texto
  if (ctx.menuImages && ctx.menuImages.length > 0) {
    ctx.menuImages.forEach(url => {
      const escapedUrl = url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:FOTO_URL|DOCUMENTO_URL|PDF_URL)?:\\s*\\(?[\\s]*${escapedUrl}[\\s]*\\)?`, 'gi');
      cleanText = cleanText.replace(regex, "");
    });
  }
  if (ctx.menuPdfUrl) {
    const escapedUrl = ctx.menuPdfUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:FOTO_URL|DOCUMENTO_URL|PDF_URL)?:\\s*\\(?[\\s]*${escapedUrl}[\\s]*\\)?`, 'gi');
    cleanText = cleanText.replace(regex, "");
  }
  cleanText = cleanText
    .replace(/(?:FOTO_URL|DOCUMENTO_URL|PDF_URL):\s*https?:\/\/\S+/gi, "")
    .replace(/(?:FOTO_URL|DOCUMENTO_URL|PDF_URL):/gi, "");

  // Limpiar espacios múltiples y saltos de línea sobrantes
  cleanText = cleanText
    .replace(/:\s*$/g, "") // Eliminar dos puntos al final de una frase si queda vacía la continuación
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (!cleanText) {
    cleanText = rawResponse.replace(/\[USER_NAME:[^\]]+\]/gi, "").replace(/\[SUMMARY:[^\]]+\]/gi, "").trim()
    if (!cleanText) {
      cleanText = `¡Hola! Con gusto te ayudo con tu pedido en *${ctx.companyName}*. ¿Podrías indicarme qué pizza o producto te gustaría ordenar?`
    }
  }

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
    isPedidoPendienteComprobante,
    pedidoPendienteData,
    isPagoSolicitado,
    agendarCita,
    isEscaladoSoporte,
    escalationData,
    solicitarReserva,
    reservaExcedeLimite,
    enviarUbicacion,
    userName,
    summary,
    cleanText,
    tokensUsed,
  }
}
