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
  locationConfig?: {
    hasPhysicalLocation: boolean
    lat: number
    lng: number
    address: string
  }
  website: string
  instagram: string
  facebook: string
  contactEmail: string
  contactPhone: string
  enabledNodes: string[]
  notifPhone: string
  shippingZones?: string
  menuImages?: string[]
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
    occupiedSlots?: Record<string, number>
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
    let org = await prisma.organization.findFirst({
      where: { evolutionInstance: instanceName },
      include: {
        businessConfig: true,
        products: { orderBy: { createdAt: "asc" } }
      },
    })

    if (!org) {
      console.warn(`[CONTEXT_LOADER]: Instancia "${instanceName}" no encontrada en DB. Intentando fallback por número de WhatsApp...`)
      try {
        const EVO_URL = process.env.EVOLUTION_URL || process.env.EVOLUTION_API_URL
        const EVO_API_KEY = process.env.EVOLUTION_API_KEY
        if (EVO_URL && EVO_API_KEY) {
          const cleanUrl = EVO_URL.replace(/['"]/g, "").replace(/\/$/, "");
          const res = await fetch(`${cleanUrl}/instance/connectionState/${instanceName}`, {
            headers: { "apikey": EVO_API_KEY },
            cache: "no-store"
          })
          if (res.ok) {
            const data = await res.json()
            const ownerJid = data?.instance?.owner || data?.owner

            // Estrategia 1: usar el ownerJid que devuelve Evolution
            if (ownerJid) {
              const whatsappNumber = ownerJid.split("@")[0].split(":")[0]
              console.log(`[CONTEXT_LOADER]: Consultando org para número de WhatsApp: ${whatsappNumber}`)
              org = await prisma.organization.findFirst({
                where: { whatsappNumber: whatsappNumber },
                include: {
                  businessConfig: true,
                  products: { orderBy: { createdAt: "asc" } }
                }
              })
              if (org) {
                console.log(`[CONTEXT_LOADER]: Auto-corrigiendo evolutionInstance para org "${org.name}" (ID: ${org.id}) a "${instanceName}"`)
                org = await prisma.organization.update({
                  where: { id: org.id },
                  data: {
                    evolutionInstance: instanceName,
                    evolutionToken: instanceName
                  },
                  include: {
                    businessConfig: true,
                    products: { orderBy: { createdAt: "asc" } }
                  }
                })
              }
            } else {
              // Estrategia 2: Evolution no devuelve owner, intentar buscar org
              // cuya whatsappNumber coincida con el sender del webhook (pasado via sentryResult)
              console.warn(`[CONTEXT_LOADER_WARN]: No se pudo obtener el owner de connectionState para "${instanceName}".`, data)

              // Estrategia 3: buscar cualquier org sin instancia asignada y asignar esta
              const unlinkedOrg = await prisma.organization.findFirst({
                where: {
                  OR: [
                    { evolutionInstance: null },
                    { evolutionInstance: "" }
                  ]
                },
                include: {
                  businessConfig: true,
                  products: { orderBy: { createdAt: "asc" } }
                }
              })
              if (unlinkedOrg) {
                console.log(`[CONTEXT_LOADER]: Vinculando instancia "${instanceName}" a org sin instancia: "${unlinkedOrg.name}"`)
                org = await prisma.organization.update({
                  where: { id: unlinkedOrg.id },
                  data: {
                    evolutionInstance: instanceName,
                    evolutionToken: instanceName
                  },
                  include: {
                    businessConfig: true,
                    products: { orderBy: { createdAt: "asc" } }
                  }
                })
              }
            }
          } else {
            console.warn(`[CONTEXT_LOADER_WARN]: Fallo al consultar connectionState en Evolution para "${instanceName}". Status: ${res.status}`)
          }
        } else {
          console.warn("[CONTEXT_LOADER_WARN]: Credenciales de Evolution no configuradas para fallback.")
        }
      } catch (fallbackErr: any) {
        console.error("[CONTEXT_LOADER_FALLBACK_ERROR]:", fallbackErr?.message ?? fallbackErr)
      }
    }

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

    let occupiedSlots: Record<string, number> = {}
    if (enabledNodes.includes("reservations")) {
      const now = new Date()
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      
      const confirmedReservations = await prisma.reserva.findMany({
        where: {
          organizationId: org.id,
          estado: "confirmado",
          fecha_hora_deseada: {
            gte: now,
            lte: in7Days
          }
        }
      })

      confirmedReservations.forEach(r => {
        const d = r.fecha_hora_deseada
        const dateStr = d.toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }) // YYYY-MM-DD
        const hourStr = d.toLocaleTimeString("en-GB", { timeZone: "America/Guayaquil", hour: "2-digit" }) // HH
        const key = `${dateStr} ${hourStr}:00`
        occupiedSlots[key] = (occupiedSlots[key] || 0) + r.cantidad_personas
      })
    }


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
      locationConfig: ctx.locationConfig ?? {
        hasPhysicalLocation: true,
        lat: -0.180653,
        lng: -78.467834,
        address: ctx.address ?? ""
      },
      website: ctx.website ?? "",
      instagram: ctx.instagram ?? "",
      facebook: ctx.facebook ?? "",
      contactEmail: ctx.contactEmail ?? "",
      contactPhone: ctx.contactPhone ?? "",
      notifPhone: ctx.notifPhone ?? "",
      shippingZones: ctx.shippingZones ?? "",
      menuImages: ctx.menuImages || (ctx.menuImageUrl ? [ctx.menuImageUrl] : []),
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
        occupiedSlots
      }
    }


  } catch (err: any) {
    console.error("[CONTEXT_LOADER_ERROR]:", err?.message ?? err)
    return null
  }
}
