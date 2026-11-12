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
          { type: "input_file", file_url: pdfUrl },
          { type: "input_text", text: `Extrae todos los productos y bebidas visibles. Devuelve solo JSON válido con esta estructura: {"platos":[{"nombre":"nombre exacto","categoria":"sección o vacío","especificacion":"descripción/ingredientes exactos del menú o vacío","tamanos":[{"nombre":"tamaño exacto","precio":"precio asociado a ESE tamaño o null"}]}]}. Registra un elemento independiente en tamanos por cada tamaño/precio del producto. Asocia cada precio únicamente con el tamaño que le corresponde según su posición, columnas, líneas o etiquetas. No tomes el primer precio como precio único ni mezcles precios entre platos. Si hay un único precio sin tamaño, usa {"nombre":"Único","precio":"..."}. Si no hay tamaños, usa []. Nunca inventes ni completes ingredientes, tamaños o precios con conocimiento externo. Si el menú es ambiguo, deja el dato vacío/null en lugar de adivinar.` }
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
