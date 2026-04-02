"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function finalizeOnboarding(data: {
  name: string;
  niche: string;
  context: string;
}) {
  try {
    // Creamos la organización y su configuración inicial
    // Nota: El ownerEmail podrías sacarlo de la sesión de Google Auth luego
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        niche: data.niche,
        ownerEmail: "admin@quantum-os.com", // Temporal para el MVP
        config: {
          create: {
            systemPrompt: `Eres el Agente de IA de ${data.name}. Especialidad: ${data.niche}. Contexto operativo: ${data.context}`,
            enabled_nodes: ["ocr", "voice", "orders"], // Activamos el arsenal base
          },
        },
      },
    });

    console.log(`[KERNEL_SUCCESS]: Nodo ${organization.id} sincronizado.`);
  } catch (error) {
    console.error("[KERNEL_CRITICAL_ERROR]:", error);
    return { error: "Fallo en la secuencia de guardado." };
  }

  // Si todo sale bien, al búnker
  redirect("/dashboard");
}