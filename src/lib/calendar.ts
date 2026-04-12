import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Obtiene un cliente de Google Calendar autenticado para una organización.
 */
export async function getCalendarClient(organizationId: string) {
  // Buscamos el usuario dueño de la organización
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { userId: true },
  });

  if (!org) throw new Error("Organización no encontrada");

  // Buscamos la cuenta de Google vinculada
  const account = await prisma.account.findFirst({
    where: { userId: org.userId, provider: "google" },
  });

  if (!account) throw new Error("Cuenta de Google no vinculada");

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Si el token expiró, lo refrescamos (Google-auth maneja esto si hay refresh_token)
  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Obtiene los huecos ocupados en un rango de tiempo.
 */
export async function getBusySlots(organizationId: string, timeMin: Date, timeMax: Date) {
  const calendar = await getCalendarClient(organizationId);
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  return response.data.calendars?.primary?.busy || [];
}

/**
 * Crea una cita en el calendario.
 * Duración por defecto: 60 minutos (definido por el usuario).
 */
export async function createAppointment(
  organizationId: string,
  details: { 
    customerName: string;
    customerPhone: string;
    service: string;
    startTime: Date;
    summary?: string;
  }
) {
  const calendar = await getCalendarClient(organizationId);
  
  const endTime = new Date(details.startTime.getTime() + 60 * 60 * 1000); // +60 min

  const event = {
    summary: details.summary || `${details.service} - ${details.customerName}`,
    description: `Agendado vía Quantum OS\nCliente: ${details.customerName}\nTeléfono: ${details.customerPhone}`,
    start: {
      dateTime: details.startTime.toISOString(),
      timeZone: "America/Guayaquil", // ECUADOR
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "America/Guayaquil",
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data;
}
