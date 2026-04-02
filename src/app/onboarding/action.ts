"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function finalizeOnboarding(data: {
  niche: string;
  needs: string[];
  masterPrompt: string;
  testPhone: string;
}) {
  try {
    const organization = await prisma.organization.create({
      data: {
        name: `Nodo_Operativo_${data.testPhone.slice(-4)}`, // Nombre técnico autogenerado
        whatsappNumber: data.testPhone, // <- AQUÍ ESTÁ EL DATO FALTANTE
        onboardingStep: 3,
        protocolActive: true,
        businessConfig: {
          create: {
            niche: data.niche.toUpperCase(),
            // Guardamos el masterPrompt y el array de nodos elegidos
            config: {
              context: data.masterPrompt,
              enabled_nodes: data.needs 
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