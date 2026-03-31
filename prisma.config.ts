import { defineConfig } from "prisma/config"

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://juan:juanpiz01@postgres_postgres:5432/postgres?schema=public&sslmode=disable",
  },
})