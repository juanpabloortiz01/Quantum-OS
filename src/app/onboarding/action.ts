"use server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerQuantumUser(data: { email: string; password?: string }) {
  try {
    // 1. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) return { success: true, userId: existingUser.id };

    // 2. Si no existe y tiene contraseña, lo creamos
    let hashedPassword = undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
      }
    });

    return { success: true, userId: newUser.id };
  } catch (error) {
    return { error: "FALLO_CRÍTICO_EN_REGISTRO" };
  }
}