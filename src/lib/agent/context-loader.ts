/**
 * ─────────────────────────────────────────────────
 *  QUANTUM OS — NODO 4: CONTEXT LOADER
 *  El Bibliotecario. Solo trae lo que se necesita.
 *  Eficiencia de acero: cero queries innecesarias.
 * ─────────────────────────────────────────────────
 */

import { prisma } from "@/lib/prisma"
import { SentryResult } from "./sentry"
import { getBusySlots } from "@/lib/calendar"


export interface LoadedContext {
  organizationId: string
  companyName: string
  niche: string

  service: string
  description: string
  scheduleDays: string[]
  openTime: string
  closeTime: string
  scheduleType?: "custom" | "24h"
  scheduleConfig?: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>
  address: string
  website: string
  instagram: string
  facebook: string
  contactEmail: string
  contactPhone: string
  enabledNodes: string[]
  notifPhone: string
  shippingZones?: string
  loyaltyRule?: {

    triggerCount: string
    triggerProduct: string
    rewardCount: string
    rewardProduct: string
  }
  products: ProductContext[]


  evolutionInstance: string
  evolutionToken: string
  whatsappNumber: string
  calendarAvailability?: any[] 
  schedulingConfig?: {
    maxSimultaneousEvents: number
    limitPerPersonPerDay: number
  }
  reservationsConfig?: {
    limite_grupo_autonomo: number
    tope_personas_por_hora: number
  }
}



export interface ProductContext {
  imageUrl: string
  category: string | null
  brand: string | null
  primaryColor: string | null
  secondaryColor: string | null
  characteristics: string | null
  style: string | null
}

/**
 * Carga el contexto del negocio desde la DB.
 * Solo consulta productos si el Sentry lo requiere.
 */
export async function loadContext(
  instanceName: string,
  sentryResult: SentryResult
): Promise<LoadedContext | null> {
  try {
    // Buscar organización por nombre de instancia de Evolution
    const org = await prisma.organization.findFirst({
      where: { evolutionInstance: instanceName },
      include: {
        businessConfig: true,
        products: { orderBy: { createdAt: "asc" } }
      },

    })

    if (!org) {
      console.error(`[CONTEXT_LOADER_ERROR]: No se encontró organización para instancia: ${instanceName}`)
      return null
    }

    const config = (org.businessConfig?.config as any) ?? {}
    const ctx = config.context ?? {}
    const enabledNodes: string[] = config.enabled_nodes ?? []

    const products: ProductContext[] = (org.products ?? []).map((p) => ({
      imageUrl: p.imageUrl,
      category: p.category,
      brand: p.brand,
      primaryColor: p.primaryColor,
      secondaryColor: p.secondaryColor,
      characteristics: p.characteristics,
      style: p.style,
    }))


    return {
      organizationId: org.id,
      companyName: org.name,
      niche: org.businessConfig?.niche || "AGENDA",
      service: ctx.service ?? "",

      description: ctx.description ?? "",
      scheduleDays: ctx.scheduleDays ?? [],
      openTime: ctx.openTime ?? "09:00",
      closeTime: ctx.closeTime ?? "18:00",
      scheduleType: ctx.scheduleType,
      scheduleConfig: ctx.scheduleConfig,
      address: ctx.address ?? "",
      website: ctx.website ?? "",
      instagram: ctx.instagram ?? "",
      facebook: ctx.facebook ?? "",
      contactEmail: ctx.contactEmail ?? "",
      contactPhone: ctx.contactPhone ?? "",
      notifPhone: ctx.notifPhone ?? "",
      shippingZones: ctx.shippingZones ?? "",
      loyaltyRule: config.loyaltyRule ?? undefined,

      enabledNodes,


      products,
      evolutionInstance: org.evolutionInstance ?? "",
      evolutionToken: org.evolutionToken ?? "",
      whatsappNumber: org.whatsappNumber,
      calendarAvailability: enabledNodes.includes("calendar") 
        ? await getBusySlots(org.id, new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).catch(() => [])
        : [],
      schedulingConfig: {
        maxSimultaneousEvents: config.scheduling?.maxSimultaneousEvents ?? 1,
        limitPerPersonPerDay: config.scheduling?.limitPerPersonPerDay ?? 1,
      },
      reservationsConfig: {
        limite_grupo_autonomo: config.reservationsConfig?.limite_grupo_autonomo ?? 6,
        tope_personas_por_hora: config.reservationsConfig?.tope_personas_por_hora ?? 25,
      }
    }


  } catch (err: any) {
    console.error("[CONTEXT_LOADER_ERROR]:", err?.message ?? err)
    return null
  }
}
