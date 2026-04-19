"use server"

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

import { auth } from "@/auth"

// Validadores de servidor
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const isStrongPassword = (password: string) =>
  password.length >= 8

export async function registerQuantumUser(data: {
  email: string
  password?: string
}) {
  // Sanitizar inputs
  const email = String(data.email).toLowerCase().trim()

  // Validar en servidor — nunca confiar en el cliente
  if (!isValidEmail(email)) {
    return { error: "FORMAT_ERROR: Email inválido." }
  }

  if (data.password && !isStrongPassword(data.password)) {
    return { error: "WEAK_PASSWORD: Mínimo 8 caracteres." }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // No revelar que el usuario existe — mensaje genérico
      return { error: "REGISTER_ERROR: No se pudo completar el registro." }
    }

    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 12) // Factor 12 en producción
      : undefined

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    return { success: true, userId: newUser.id }
  } catch (error) {
    console.error("[REGISTER_ERROR]:", error)
    return { error: "KERNEL_ERROR: Fallo crítico en el registro." }
  }
}

export async function finalizeOnboarding(data: {
  userId: string
  niche: string
  needs: string[]
  contextData: any
  products: any[]
  testPhone: string
}) {
  // Validar que el userId existe
  if (!data.userId) return { error: "AUTH_ERROR: Usuario no identificado." }

  const businessName = data.contextData.companyName?.trim() || (data.testPhone ? `NODO_${data.testPhone.slice(-4).toUpperCase()}` : `NODO_${data.userId.slice(-4).toUpperCase()}`)

  try {
    await prisma.organization.create({
      data: {
        name: businessName,
        whatsappNumber: data.testPhone,
        onboardingStep: 3,
        protocolActive: true,
        evolutionInstance: `quos_${data.userId}`,
        evolutionToken: `quos_${data.userId}`,
        userId: data.userId,
        businessConfig: {
          create: {
            niche: data.niche.toUpperCase(),
            config: {
              context: data.contextData,
              enabled_nodes: data.needs,
            },
          },
        },
        products: {
          create: data.products.map((p: any) => ({
            imageUrl: p.url_foto,
            category: p.categoria,
            primaryColor: p.color_principal,
            secondaryColor: p.color_secundario,
            brand: p.marca,
            characteristics: p.caracteristicas,
            style: p.estilo
          }))
        }
      },
    })

    console.log(`[KERNEL_SUCCESS]: Organización ${businessName} compilada.`)
  } catch (error) {
    console.error("[KERNEL_ERROR]:", error)
    return { error: "FALLO_COMPILACIÓN: No se pudo registrar la organización." }
  }

  redirect("/dashboard")
}

export async function sendTestPing(phone: string) {
  // Validar formato de teléfono
  const cleanPhone = phone.replace(/\s/g, "")
  if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
    return { success: false, error: "FORMATO_INVÁLIDO: Verifica el número." }
  }

  try {
    const res = await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EVOLUTION_API_KEY!,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: "⚡ QUANTUM_OS ONLINE\n\nConexión establecida con tu agente. Responde este mensaje para iniciar el testeo del protocolo.",
        }),
      }
    )

    if (!res.ok) throw new Error(`EVO_API_ERROR: ${res.status}`)
    return { success: true }
  } catch (error) {
    console.error("[PING_ERROR]:", error)
    return {
      success: false,
      error: "PING_FALLIDO: Verifica la instancia de EvolutionAPI.",
    }
  }
}

export async function getCloudinaryConfig() {
  return {
    // Lectura dinámica robusta de variables, ignorando la caché estática de Next.js
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "dorpspwig",
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_CLOUDINARY_UPLOAD_PRESET || "quantum_os"
  }
}

export async function setupEvolutionInstance(method: "qr" | "code", phoneNumber?: string, tempId?: string) {
  try {
    const session = await auth()
    let userId = session?.user?.id
    let userEmail = session?.user?.email

    // Si no hay sesión, usamos el tempId proporcionado (ej. hash del email o random)
    const effectiveId = userId || tempId
    if (!effectiveId) throw new Error("No se proporcionó identificador (sesión o temporal).")

    const user = userEmail ? await prisma.user.findUnique({
      where: { email: userEmail }
    }) : null

    const org = user ? await prisma.organization.findFirst({
      where: { userId: user.id },
    }) : null


    const EVO_URL = process.env.EVOLUTION_URL || process.env.EVOLUTION_API_URL
    const EVO_API_KEY = process.env.EVOLUTION_API_KEY

    if (!EVO_URL || !EVO_API_KEY) {
      throw new Error("Credenciales maestras de Evolution no configuradas en el servidor VPS.")
    }

    const instanceName = org?.evolutionInstance || `quos_${effectiveId}`
    let instanceToken = org?.evolutionToken || instanceName

    // ── AUTO-LIMPIEZA DE INSTANCIAS "STUCK" ─────────────────────────────
    // Si la instancia ya existe pero no está abierta (ej. stuck en connecting),
    // la borramos para asegurar una sesión Baileys limpia.
    try {
      const stateRes = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
        headers: { "apikey": EVO_API_KEY as string }
      });
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const currentState = stateData.instance?.state || stateData.state;

        if (currentState === "open" || currentState === "CONNECTED") {
          console.log(`[EVO_INFO]: Instancia ya está conectada y abierta: ${instanceName}`);
          return { success: true, connected: true, instanceName };
        }

        if (currentState !== "open") {
          console.log(`[EVO_CLEANUP]: Borrando instancia stuck (${currentState}): ${instanceName}`);
          await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
            method: "DELETE",
            headers: { "apikey": EVO_API_KEY as string }
          });
          // Esperar a que el sistema de archivos del VPS libere la sesión
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (e) {
      // Ignorar errores si la instancia no existe
    }

    const createPayload: any = {
      instanceName: instanceName,
      token: instanceToken, // Forzamos un token seguro y predecible basado en la organización
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      groupsIgnore: true,
    };

    // Agregar el número desde la creación de la instancia si existe y el método es "code"
    if (phoneNumber && method === "code") {
      createPayload.number = phoneNumber;
    }

    await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_API_KEY },
      body: JSON.stringify(createPayload)
    });

    if (org && !org.evolutionInstance) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { evolutionInstance: instanceName, evolutionToken: instanceToken }
      })
    }

    // ── AUTO-REGISTRO DEL WEBHOOK DE QUANTUM ─────────────────────────────
    // Vinculamos el pipeline de IA al canal de WhatsApp del cliente.
    // Solo recibimos MESSAGES_UPSERT para no procesar eventos innecesarios.
    const QUANTUM_URL = process.env.NEXTAUTH_URL ?? "https://quantum.novaautomat.site"
    const webhookPayload = {
      webhook: {
        enabled: true,
        url: `${QUANTUM_URL}/api/agent/webhook`,
        webhookByEvents: false,
        webhookBase64: true,    // Base64 necesario para procesar imágenes
        events: ["MESSAGES_UPSERT"],
      },
    }

    await fetch(`${EVO_URL}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVO_API_KEY },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => {
      // No bloquear el onboarding si falla el registro del webhook
      console.warn("[WEBHOOK_REGISTER_WARN]:", err?.message ?? err)
    })

    console.log(`[WEBHOOK_REGISTERED]: ${QUANTUM_URL}/api/agent/webhook → instancia: ${instanceName}`)

    // Retrasar medio segundo más para que Evolution levante Baileys
    await new Promise(resolve => setTimeout(resolve, 500));

    let url = `${EVO_URL}/instance/connect/${instanceName}`
    if (method === "code" && phoneNumber) {
      url += `?number=${phoneNumber}`
    }

    const connectRes = await fetch(url, {
      method: "GET",
      headers: { "apikey": EVO_API_KEY }
    })

    const data = await connectRes.json()

    if (method === "code" && data.pairingCode) {
      return { success: true, pairingCode: data.pairingCode, instanceName }
    } else if (method === "qr" && data.base64) {
      return { success: true, base64: data.base64, instanceName }
    }

    return { success: false, error: "No se encontró QR o Código en Evolution API.", instanceName }
  } catch (error: any) {
    console.error("[EVO_SETUP_ERROR]", error)
    return { success: false, error: error.message }
  }
}

export async function checkEvolutionConnectionState(tempId?: string, explicitInstanceName?: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const userEmail = session?.user?.email

    const effectiveId = userId || tempId
    if (!effectiveId && !explicitInstanceName) return { connected: false }

    let instanceName = explicitInstanceName

    if (!instanceName) {
      const user = userEmail ? await prisma.user.findUnique({
        where: { email: userEmail }
      }) : null

      const org = user ? await prisma.organization.findFirst({
        where: { userId: user.id },
      }) : null

      instanceName = org?.evolutionInstance || `quos_${effectiveId}`
    }

    const EVO_URL = process.env.EVOLUTION_URL || process.env.EVOLUTION_API_URL
    const EVO_API_KEY = process.env.EVOLUTION_API_KEY

    // Poll a Evolution API usando la Admin Key
    const res = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
      headers: { "apikey": EVO_API_KEY as string },
      cache: "no-store"
    })

    if (!res.ok) return { connected: false }

    const data = await res.json()
    // En evolution, state "open" indica que ya emparejó el número de WhatsApp exitosamente.
    // Buscamos en data.instance.state o data.state para mayor compatibilidad
    const state = data?.instance?.state || data?.state
    const isConnected = state === "open" || state === "CONNECTED"

    return { connected: isConnected }
  } catch (err) {
    return { connected: false }
  }
}
export async function registerAndFinalizeOnboarding(authData: {
  email: string
  password?: string
}, onboardingData: {
  niche: string
  needs: string[]
  contextData: any
  products: any[]
  testPhone: string
  tempId?: string
}) {
  // 1. REGISTRAR USUARIO
  const regResult = await registerQuantumUser(authData)
  if ("error" in regResult) return regResult

  const userId = regResult.userId

  // 2. FINALIZAR ONBOARDING (CREAR ORG)
  try {
    const businessName = onboardingData.contextData.companyName?.trim() || (onboardingData.testPhone ? `NODO_${onboardingData.testPhone.slice(-4).toUpperCase()}` : `NODO_${(onboardingData.tempId || userId).slice(-4).toUpperCase()}`)

    // El instance name debe coincidir con el usado en setupEvolutionInstance
    const instanceName = `quos_${onboardingData.tempId || userId}`

    await prisma.organization.create({
      data: {
        name: businessName,
        whatsappNumber: onboardingData.testPhone,
        onboardingStep: 3,
        protocolActive: true,
        evolutionInstance: instanceName,
        evolutionToken: instanceName,
        userId: userId,
        businessConfig: {
          create: {
            niche: onboardingData.niche.toUpperCase(),
            config: {
              context: onboardingData.contextData,
              enabled_nodes: onboardingData.needs,
            },
          },
        },
        products: {
          create: onboardingData.products.map((p: any) => ({
            imageUrl: p.url_foto,
            category: p.categoria,
            primaryColor: p.color_principal,
            secondaryColor: p.color_secundario,
            brand: p.marca,
            characteristics: p.caracteristicas,
            style: p.estilo
          }))
        }
      },
    })

    console.log(`[KERNEL_SUCCESS]: Registro diferido completo para ${businessName}`)
    return { success: true, userId }
  } catch (error) {
    console.error("[DEFERRED_REG_ERROR]:", error)
    return { error: "FAIL: No se pudo completar el registro final." }
  }
}
