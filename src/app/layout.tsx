import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Quantum OS",
  description: "Sistema operativo de ventas y validación transaccional para WhatsApp",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
