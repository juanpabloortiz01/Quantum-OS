"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithAgent(messages: any[], type: "Ventas" | "Agenda") {
  const systemPrompt = type === "Ventas" 
    ? "Eres un Agente de Ventas de Quantum OS. Tu objetivo es ayudar a los clientes a entender nuestros servicios, resolver sus dudas de venta y guiarlos hacia la compra. Eres persuasivo, claro y profesional."
    : "Eres un Asistente de Agenda de Quantum OS. Tu objetivo es ayudar a los clientes a programar citas, gestionar sus horarios y responder dudas sobre disponibilidad. Eres organizado, amable y preciso.";

  const messages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.parts.map((p: any) => p.text).join("\n"),
    }))
  ];

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: messages as any,
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1024,
    });

    return chatCompletion.choices[0]?.message?.content || "Lo siento, no pude procesar tu mensaje.";
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return "Lo siento, hubo un problema al conectar con el agente. Por favor intenta de nuevo.";
  }
}
