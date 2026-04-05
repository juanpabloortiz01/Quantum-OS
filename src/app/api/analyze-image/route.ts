import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl es requerido" }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analizá esta imagen de producto de moda o accesorios y devolvé 
              ÚNICAMENTE un JSON válido sin markdown con esta estructura exacta:
              {
                "categoria": "Gorras|Ropa|Accesorios|Calzado|Otro",
                "color_principal": "color en español",
                "color_secundario": "color en español o null",
                "marca": "marca visible o null",
                "caracteristicas": "descripción máximo 15 palabras en español",
                "estilo": "Casual|Deportivo|Formal|Otro"
              }`
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const text = response.choices[0].message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())

    return NextResponse.json({ success: true, data: parsed })
  } catch (error: any) {
    console.error("[ANALYZE_IMAGE_ERROR]:", error)
    return NextResponse.json(
      { error: "Error al analizar la imagen", detail: error.message },
      { status: 500 }
    )
  }
}
