import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const { imageUrl, niche } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl es requerido" }, { status: 400 })
    }

    const isMenu = niche === "ventas"
    const isAgenda = niche === "agenda"

    // ── PROMPT PARA MENÚ DE RESTAURANTE (VENTAS) ─────────────────────────────
    const menuPrompt = `Eres un sistema experto en reconocimiento óptico y análisis gastronómico.
Tu tarea es realizar una extracción exhaustiva de CADA plato o bebida presente en la imagen del menú.

INSTRUCCIONES CRÍTICAS:
1. Escanea la imagen de izquierda a derecha y de arriba abajo.
2. Identifica CADA ítem individual. No omitas ninguno por pequeño que sea.
3. Extrae:
   - "nombre": El nombre exacto como aparece.
   - "descripcion": Los ingredientes o detalles listados. Si no hay, crea una breve descripción apetitosa basada en el nombre.
   - "precio": Solo el valor numérico con su símbolo (ej: $12.00). Si no hay, usa null.

Devuelve ÚNICAMENTE un JSON válido:
{
  "platos": [
    {
      "nombre": "string",
      "descripcion": "string (máx 20 palabras)",
      "precio": "string o null"
    }
  ]
}

REGLA DE ORO: Si hay 20 platos en la imagen, DEBES devolver 20 objetos. Sé extremadamente meticuloso.`

    // ── PROMPT PARA AGENDA (SERVICIOS) ─────────────────────────────────────
    const servicePrompt = `Eres un experto en extracción de datos para centros de servicios (clínicas, spas, barberías).
Analiza esta imagen e identifica cada servicio, tratamiento o paquete ofrecido.

INSTRUCCIONES:
1. Identifica cada servicio individualmente.
2. Extrae:
   - "nombre": El nombre del servicio (ej: Limpieza Facial profunda, Corte de Cabello).
   - "descripcion": Detalle breve de qué incluye o para qué sirve. Máximo 15 palabras.
   - "precio": El valor con su moneda (ej: $35.00). Si no hay, usa null.

Devuelve ÚNICAMENTE un JSON válido:
{
  "servicios": [
    {
      "nombre": "string",
      "descripcion": "string",
      "precio": "string o null"
    }
  ]
}

REGLA DE ORO: Si hay una lista de servicios, extrae todos los que sean claramente visibles.`

    const prompt = isMenu ? menuPrompt : servicePrompt

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cambiado a modelo más económico
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: imageUrl, 
                detail: "high" 
              } 
            }
          ]
        }
      ],
      temperature: 0.1, 
      max_tokens: 1500
    })

    const text = response.choices[0].message?.content || "{}"
    const cleanText = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleanText)

    return NextResponse.json({ success: true, data: parsed, isMenu, isAgenda })
  } catch (error: any) {
    console.error("[ANALYZE_IMAGE_ERROR]:", error)
    return NextResponse.json(
      { error: "Error al analizar la imagen", detail: error.message },
      { status: 500 }
    )
  }
}
