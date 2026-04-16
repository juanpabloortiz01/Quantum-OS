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

    // ── PROMPT PARA MENÚ DE RESTAURANTE ─────────────────────────────────────
    const menuPrompt = `Eres un asistente experto en gastronomía. Analiza esta imagen de un menú de restaurante.
IMPORTANTE: La imagen puede tener UNO o VARIOS platos. Debes identificar CADA plato por separado.

Devuelve ÚNICAMENTE un JSON válido sin markdown con esta estructura:
{
  "platos": [
    {
      "nombre": "Nombre exacto del plato",
      "descripcion": "Descripción breve del plato, máximo 20 palabras",
      "precio": "Precio con símbolo de moneda (ej: $8.50) o null si no se ve"
    }
  ]
}

Reglas:
- Si hay 3 platos en la imagen, devuelve 3 objetos en el array.
- Si hay 10 platos, devuelve 10 objetos.
- Nunca agrupes platos distintos en un solo objeto.
- Si no se ve el precio de un plato, pon null.
- Descripciones en español.`

    // ── PROMPT PARA SHOWROOM / MODA ──────────────────────────────────────────
    const fashionPrompt = `Analizá esta imagen de producto de moda o accesorios y devolvé 
ÚNICAMENTE un JSON válido sin markdown con esta estructura exacta:
{
  "categoria": "Gorras|Ropa|Accesorios|Calzado|Otro",
  "color_principal": "color en español",
  "color_secundario": "color en español o null",
  "marca": "marca visible o null",
  "caracteristicas": "descripción máximo 15 palabras en español",
  "estilo": "Casual|Deportivo|Formal|Otro"
}`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: isMenu ? menuPrompt : fashionPrompt
            },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" }
            }
          ]
        }
      ],
      max_tokens: 2000
    })

    const text = response.choices[0].message?.content || "{}"
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())

    return NextResponse.json({ success: true, data: parsed, isMenu })
  } catch (error: any) {
    console.error("[ANALYZE_IMAGE_ERROR]:", error)
    return NextResponse.json(
      { error: "Error al analizar la imagen", detail: error.message },
      { status: 500 }
    )
  }
}
