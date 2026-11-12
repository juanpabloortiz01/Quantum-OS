import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const { imageUrl, imageUrls, niche } = await req.json()

    const urls: string[] = imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls
      : (imageUrl ? [imageUrl] : [])

    if (urls.length === 0) {
      return NextResponse.json({ error: "imageUrl o imageUrls es requerido" }, { status: 400 })
    }

    const isMenu = niche === "ventas"
    const isAgenda = niche === "agenda"

    // ── PROMPT PARA MENÚ DE RESTAURANTE / PIZZERÍA (VENTAS) ─────────────────
    const menuPrompt = `Eres un sistema experto en reconocimiento óptico y análisis gastronómico para pizzerías y restaurantes.
Tu tarea es realizar una extracción exhaustiva y detallada de CADA plato, pizza, entrada, bebida o postre presente en el menú.

INSTRUCCIONES CRÍTICAS:
1. Escanea las imágenes completas de izquierda a derecha y de arriba a abajo.
2. Identifica CADA ítem individual disponible para venta.
3. Extrae con exactitud:
   - "nombre": El nombre exacto del plato o pizza (ej: "Pizza Cuatro Quesos", "Pizza Pepperoni Especial").
   - "categoria": La sección o tipo (ej: "Pizzas Tradicionales", "Pizzas Gourmet", "Bebidas", "Entradas", "Postres").
   - "descripcion": Todos los ingredientes listados y tamaños disponibles (ej: "Salsa pomodoro, mozzarella fior di latte, gorgonzola, parmesano. Tamaños: Mediana (8 porciones), Familiar (12 porciones)"). Si la imagen no lista ingredientes, incluye una descripción apetitosa con los ingredientes clásicos de ese plato.
   - "precio": El valor monetario o desglose por tamaño (ej: "$14.00" o "Personal: $7, Mediana: $12, Familiar: $16"). Si no hay precio explícito, usa null.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "platos": [
    {
      "nombre": "string",
      "categoria": "string",
      "descripcion": "string detallada con ingredientes y tamaños",
      "precio": "string o null"
    }
  ]
}

REGLA DE ORO: Extrae TODOS los ítems visibles sin omitir ninguno. Esta información será el catálogo de verdad que el mesero virtual usará para confirmar o negar platos y detallar ingredientes a los clientes.`

    // ── PROMPT PARA AGENDA (SERVICIOS) ─────────────────────────────────────
    const servicePrompt = `Eres un experto en extracción de datos para centros de servicios (clínicas, spas, barberías).
Analiza esta imagen e identifica cada servicio, tratamiento o paquete ofrecido.

INSTRUCCIONES:
1. Identifica cada servicio individualmente.
2. Extrae:
   - "nombre": El nombre del servicio (ej: Limpieza Facial profunda, Corte de Cabello).
   - "categoria": Categoría del servicio si aplica.
   - "descripcion": Detalle breve de qué incluye o para qué sirve.
   - "precio": El valor con su moneda (ej: $35.00). Si no hay, usa null.

Devuelve ÚNICAMENTE un JSON válido:
{
  "servicios": [
    {
      "nombre": "string",
      "categoria": "string",
      "descripcion": "string",
      "precio": "string o null"
    }
  ]
}

REGLA DE ORO: Si hay una lista de servicios, extrae todos los que sean claramente visibles.`

    const prompt = isMenu ? menuPrompt : servicePrompt

    const content: any[] = [{ type: "text", text: prompt }]
    for (const u of urls) {
      content.push({
        type: "image_url",
        image_url: {
          url: u,
          detail: "high"
        }
      })
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content
        }
      ],
      temperature: 0.1, 
      max_tokens: 3000
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
