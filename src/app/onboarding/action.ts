"use server"

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

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
  masterPrompt: string
  testPhone: string
}) {
  // Validar que el userId existe
  if (!data.userId) return { error: "AUTH_ERROR: Usuario no identificado." }

  const nameMatch = data.masterPrompt.match(/['"]([^'"]+)['"]/)
  const businessName = nameMatch
    ? nameMatch[1]
    : `NODO_${data.testPhone.slice(-4).toUpperCase()}`

  try {
    await prisma.organization.create({
      data: {
        name: businessName,
        whatsappNumber: data.testPhone,
        onboardingStep: 3,
        protocolActive: true,
        userId: data.userId,
        businessConfig: {
          create: {
            niche: data.niche.toUpperCase(),
            config: {
              context: data.masterPrompt,
              enabled_nodes: data.needs,
            },
          },
        },
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