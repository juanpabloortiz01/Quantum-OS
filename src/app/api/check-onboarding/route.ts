import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ completed: false })
  }

  const organization = await prisma.organization.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({
    completed: !!organization && organization.protocolActive,
  })
}