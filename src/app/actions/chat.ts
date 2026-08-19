"use server";

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function chatWithAgent(messages: any[], type: "Ventas" | "Agenda") {
  const systemPrompt = type === "Ventas" 
    ? "Eres un Agente de Ventas de Quantum OS. Tu objetivo es ayudar a los clientes a entender nuestros servicios, resolver sus dudas de venta y guiarlos hacia la compra. Eres persuasivo, claro y profesional."
    : "Eres un Asistente de Agenda de Quantum OS. Tu objetivo es ayudar a los clientes a programar citas, gestionar sus horarios y responder dudas sobre disponibilidad. Eres organizado, amable y preciso.";

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.parts.map((p: any) => p.text).join("\n"),
    }))
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages as any,
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1024,
    });

    return chatCompletion.choices[0]?.message?.content || "Lo siento, no pude procesar tu mensaje.";
  } catch (error) {
    console.error("Error calling Groq:", error);
    return "Lo siento, hubo un problema al conectar con el agente. Por favor intenta de nuevo.";
  }
}
