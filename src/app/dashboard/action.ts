"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { sendText } from "@/lib/agent/dispatcher"
import { createAppointment } from "@/lib/calendar"

export async function saveSchedulingConfig(config: {
  simultaneous: number
  limitPerDay: number
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id },
      include: { businessConfig: true }
    })

    if (!org) return { error: "Organización no encontrada" }

    const currentConfig = (org.businessConfig?.config as any) || {}
    
    // Actualizamos la configuración de agendamiento
    const updatedConfig = {
      ...currentConfig,
      scheduling: {
        maxSimultaneousEvents: config.simultaneous,
        limitPerPersonPerDay: config.limitPerDay,
        bufferTimeMinutes: 15, // Por defecto como pidió el usuario
      }
    }

    await prisma.businessConfig.update({
      where: { organizationId: org.id },
      data: { config: updatedConfig }
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("[SAVE_SCHED_CONFIG_ERROR]:", error)
    return { error: "No se pudo guardar la configuración" }
  }
}

export async function getCalendarConnectionStatus() {
  const session = await auth()
  if (!session?.user?.id) return { connected: false }

  const account = await prisma.account.findFirst({
    where: { 
      userId: session.user.id, 
      scope: { contains: "calendar" }
    }
  })


  return { connected: !!account }
}

export async function saveActiveSkills(skillIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id },
      include: { businessConfig: true }
    })

    if (!org) return { error: "Organización no encontrada" }

    const currentConfig = (org.businessConfig?.config as any) || {}
    const updatedConfig = {
      ...currentConfig,
      enabled_nodes: skillIds
    }

    await prisma.businessConfig.update({
      where: { organizationId: org.id },
      data: { config: updatedConfig }
    })

    return { success: true }
  } catch (error: any) {
    console.error("[SAVE_ACTIVE_SKILLS_ERROR]:", error)
    return { error: "Fallo al guardar habilidades" }
  }
}

export async function getDashboardLayout() {
  const session = await auth()
  if (!session?.user?.id) return null

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id },
      include: { businessConfig: true }
    })

    if (!org) return null

    const config = (org.businessConfig?.config as any) || {}
    const activeSkills = config.enabled_nodes || []

    return {
      companyName: org.name,
      niche: org.businessConfig?.niche || "AGENDA",
      activeSkills: activeSkills as string[],
      loyaltyRule: config.loyaltyRule || null,
      whatsappNumber: org.whatsappNumber,
      notifPhone: config.context?.notifPhone,
      reservationsConfig: config.reservationsConfig || { tope_personas_por_hora: 25 },
    }
  } catch (error) {
    return null
  }
}

export async function saveLoyaltyRule(rule: {
  triggerCount: string
  triggerProduct: string
  rewardCount: string
  rewardProduct: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id },
      include: { businessConfig: true }
    })
    if (!org) return { error: "Organización no encontrada" }

    const currentConfig = (org.businessConfig?.config as any) || {}
    await prisma.businessConfig.update({
      where: { organizationId: org.id },
      data: { config: { ...currentConfig, loyaltyRule: rule } }
    })
    return { success: true }
  } catch (err: any) {
    console.error("[SAVE_LOYALTY_RULE_ERROR]:", err)
    return { error: "Fallo al guardar la regla" }
  }
}

export async function getLeads() {
  const session = await auth()
  if (!session?.user?.id) return []

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id }
    })
    if (!org) return []

    const leads = await prisma.lead.findMany({
      where: { organizationId: org.id },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })
    
    return leads.map(l => ({
      name: l.name,
      trustScore: l.trustScore,
      intent: l.intent,
      summary: l.summary || "Sin contexto",
      phone: l.customerPhone,
      agentActive: l.agentActive
    }))
  } catch (err) {
    console.error("[GET_LEADS_ERROR]:", err)
    return []
  }
}

export async function toggleAgent(phone: string, active: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id }
    })
    if (!org) return { error: "Organización no encontrada" }

    await prisma.lead.update({
      where: {
        organizationId_customerPhone: {
          organizationId: org.id,
          customerPhone: phone
        }
      },
      data: { agentActive: active }
    })
    
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err) {
    console.error("[TOGGLE_AGENT_ERROR]:", err)
    return { error: "No se pudo actualizar el estado" }
  }
}

export async function getReservas() {
  const session = await auth()
  if (!session?.user?.id) return []

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id }
    })
    if (!org) return []

    const reservas = await prisma.reserva.findMany({
      where: { organizationId: org.id },
      orderBy: { fecha_hora_deseada: "asc" }
    })

    return reservas.map((r: any) => ({
      id: r.id,
      cliente_id: r.cliente_id,
      cliente_nombre: r.cliente_nombre,
      cantidad_personas: r.cantidad_personas,
      fecha_hora_deseada: r.fecha_hora_deseada.toISOString(),
      estado: r.estado,
      propuesta_alternativa: r.propuesta_alternativa ? r.propuesta_alternativa.toISOString() : null,
      createdAt: r.createdAt.toISOString()
    }))
  } catch (error) {
    console.error("[GET_RESERVAS_ERROR]:", error)
    return []
  }
}

export async function saveReservationsConfig(config: {
  tope_personas_por_hora: number
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id },
      include: { businessConfig: true }
    })

    if (!org) return { error: "Organización no encontrada" }

    const currentConfig = (org.businessConfig?.config as any) || {}
    const updatedConfig = {
      ...currentConfig,
      reservationsConfig: {
        // Keep legacy field for dispatcher compatibility
        limite_grupo_autonomo: 999,
        tope_personas_por_hora: Number(config.tope_personas_por_hora),
      }
    }

    await prisma.businessConfig.update({
      where: { organizationId: org.id },
      data: { config: updatedConfig }
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("[SAVE_RESERVATIONS_CONFIG_ERROR]:", error)
    return { error: "No se pudo guardar la configuración de reservas" }
  }
}

export async function createManualReservation(data: {
  cliente_nombre: string
  cantidad_personas: number
  fecha_hora_deseada: string // ISO string in Ecuador time
}) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id }
    })
    if (!org) return { error: "Organización no encontrada" }

    const fechaHora = new Date(data.fecha_hora_deseada)

    await prisma.reserva.create({
      data: {
        organizationId: org.id,
        cliente_id: "manual",
        cliente_nombre: data.cliente_nombre,
        cantidad_personas: data.cantidad_personas,
        fecha_hora_deseada: fechaHora,
        estado: "confirmado"
      }
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("[CREATE_MANUAL_RESERVATION_ERROR]:", error)
    return { error: "No se pudo crear la reserva" }
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: "confirmado" | "reagendado" | "cancelado",
  alternativaIso?: string
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id }
    })
    if (!org) return { error: "Organización no encontrada" }

    const reserva = await prisma.reserva.findUnique({
      where: { id: reservationId }
    })

    if (!reserva || reserva.organizationId !== org.id) {
      return { error: "Reserva no encontrada o no autorizada" }
    }

    const updateData: any = { estado: status }
    let alternativaDate: Date | null = null

    if (status === "reagendado" && alternativaIso) {
      alternativaDate = new Date(alternativaIso)
      updateData.propuesta_alternativa = alternativaDate
    } else if (status === "confirmado" && reserva.estado === "reagendado" && reserva.propuesta_alternativa) {
      // Si se confirma una propuesta de reagendamiento, la fecha oficial pasa a ser la propuesta
      updateData.fecha_hora_deseada = reserva.propuesta_alternativa
      updateData.propuesta_alternativa = null
    }

    await prisma.reserva.update({
      where: { id: reservationId },
      data: updateData
    })

    const finalStartTime = status === "confirmado" && reserva.estado === "reagendado" && reserva.propuesta_alternativa
      ? reserva.propuesta_alternativa
      : reserva.fecha_hora_deseada

    if (status === "confirmado") {
      try {
        await createAppointment(org.id, {
          customerName: reserva.cliente_nombre,
          customerPhone: reserva.cliente_id,
          service: "Reserva de Mesa",
          startTime: finalStartTime,
          summary: `Reserva: ${reserva.cliente_nombre} - ${reserva.cantidad_personas} personas`
        })
        console.log(`[ACTION_CALENDAR]: Reserva confirmada agregada a Google Calendar`)
      } catch (calErr: any) {
        console.warn(`[ACTION_CALENDAR_WARN]: No se pudo registrar en Google Calendar:`, calErr.message)
      }
    }

    // --- ENVIAR NOTIFICACIÓN POR WHATSAPP ---
    const EVO_URL = process.env.EVOLUTION_URL ?? process.env.EVOLUTION_API_URL ?? ""
    const instanceName = org.evolutionInstance
    const token = org.evolutionToken
    const masterApiKey = process.env.EVOLUTION_API_KEY
    const authKey = token || masterApiKey || ""

    if (EVO_URL && instanceName && authKey) {
      const formatTime = (d: Date) => d.toLocaleTimeString("es-EC", {
        timeZone: "America/Guayaquil",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
      // Correct timeZone string
      const formatTimeEC = (d: Date) => d.toLocaleTimeString("es-EC", {
        timeZone: "America/Guayaquil",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      })
      const formatDateEC = (d: Date) => d.toLocaleDateString("es-EC", {
        timeZone: "America/Guayaquil",
        weekday: "long",
        day: "numeric",
        month: "long"
      })

      const targetJid = `${reserva.cliente_id}@s.whatsapp.net`
      let text = ""

      if (status === "confirmado") {
        const timeStr = formatTimeEC(finalStartTime)
        const dateStr = formatDateEC(finalStartTime)
        text = [
          `¡Reserva Confirmada! 🎉`,
          ``,
          `Hola ${reserva.cliente_nombre}, tu mesa ha sido reservada con éxito:`,
          `👥 *Personas:* ${reserva.cantidad_personas}`,
          `🗓 *Fecha:* ${dateStr}`,
          `⏰ *Hora:* ${timeStr}`,
          ``,
          `¡Te esperamos!`
        ].join("\n")
      } else if (status === "reagendado" && alternativaDate) {
        const horaOriginal = formatTimeEC(reserva.fecha_hora_deseada)
        const horaAlternativa = formatTimeEC(alternativaDate)
        text = `El restaurante estará lleno a las ${horaOriginal}. Sin embargo, podemos recibirlos perfectamente a las ${horaAlternativa}. ¿Te aseguro la mesa a esa hora?`
      }

      if (text) {
        try {
          await sendText(EVO_URL, instanceName, authKey, targetJid, text)
          console.log(`[ACTION_RESERVAS]: Confirmación enviada a cliente ${targetJid}`)
        } catch (err: any) {
          console.error(`[ACTION_RESERVAS_SEND_ERROR]:`, err.message)
        }
      }
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("[UPDATE_RESERVA_STATUS_ERROR]:", error)
    return { error: "No se pudo actualizar el estado de la reserva" }
  }
}

export async function deleteReservation(reservationId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autorizado" }

  try {
    const org = await prisma.organization.findUnique({
      where: { userId: session.user.id }
    })
    if (!org) return { error: "Organización no encontrada" }

    const reserva = await prisma.reserva.findUnique({
      where: { id: reservationId }
    })

    if (!reserva || reserva.organizationId !== org.id) {
      return { error: "Reserva no encontrada o no autorizada" }
    }

    await prisma.reserva.delete({
      where: { id: reservationId }
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("[DELETE_RESERVA_ERROR]:", error)
    return { error: "No se pudo eliminar la reserva" }
  }
}
