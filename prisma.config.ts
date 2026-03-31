import { defineConfig } from "prisma/config"

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://dummy:dummy@dummy:5432/dummy?schema=public",
  },
})