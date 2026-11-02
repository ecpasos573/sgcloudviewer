import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./app/database/connection";

config({ path: ".env.local" });

export default defineConfig({
  schema: "app/database/schema.prisma",
  migrations: {
    path: "app/database/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
});
