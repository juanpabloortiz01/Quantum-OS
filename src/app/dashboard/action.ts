"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

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
      phone: l.customerPhone
    }))
  } catch (err) {
    console.error("[GET_LEADS_ERROR]:", err)
    return []
  }
}
