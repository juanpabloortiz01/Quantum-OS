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
      provider: "google",
      scope: { contains: "calendar" }
    }
  })

  return { connected: !!account }
}
