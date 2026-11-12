import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: Request) {
  try {
    const { pdfUrl } = await req.json()
    if (typeof pdfUrl !== "string" || !pdfUrl.startsWith("https://")) {
      return NextResponse.json({ error: "pdfUrl HTTPS requerido" }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_file", file_url: pdfUrl, detail: "high" },
          { type: "input_text", text: `Extrae todos los productos y bebidas que aparecen en este menú. Devuelve solo JSON válido con la forma {"platos":[{"nombre":"texto exacto","categoria":"sección o vacío","descripcion":"solo ingredientes/tamaños explícitos, o vacío","precio":"precio explícito o null"}]}. No inventes ingredientes, categorías, tamaños, precios ni productos. Si un dato no se ve o no está escrito, déjalo vacío o null. No completes con conocimiento gastronómico externo.` }
        ]
      }],
      text: { format: { type: "json_object" } },
      store: false,
    })

    const data = JSON.parse(response.output_text || "{}")
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[ANALYZE_MENU_PDF_ERROR]:", error)
    return NextResponse.json({ error: "No se pudo analizar el PDF" }, { status: 500 })
  }
}
