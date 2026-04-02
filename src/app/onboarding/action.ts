"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function finalizeOnboarding(data: {
  name: string;
  niche: string;
  context: string;
}) {
  try {
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        onboardingStep: 3,
        protocolActive: true,
        businessConfig: {
          create: {
            niche: data.niche.toUpperCase(),
            // Guardamos el contexto y los nodos activos dentro de tu campo Json
            config: {
              context: data.context,
              enabled_nodes: ["ocr", "voice", "orders"] 
            }
          }
        }
      }
    });

    console.log(`[KERNEL_SUCCESS]: Nodo ${organization.name} creado.`);
  } catch (error) {
    console.error("[KERNEL_ERROR]:", error);
    return { error: "Fallo al compilar la Organización en la base de datos." };
  }

  redirect("/dashboard");
}