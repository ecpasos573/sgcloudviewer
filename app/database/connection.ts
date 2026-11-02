import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function envValue(name: string) {
  // Hosted environments (e.g. Netlify) provide variables directly; .env.local is local-only.
  if (process.env[name]) return process.env[name];

  const envFile = path.join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return undefined;
  const file = readFileSync(envFile, "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    if (trimmed.slice(0, separator).trim() !== name) continue;

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return undefined;
}

export function databaseUrl() {
  const raw = envValue("DATABASE_URL");
  if (!raw) {
    throw new Error("Set DATABASE_URL in the environment or .env.local.");
  }

  const url = new URL(raw);
  // node-pg does not accept Prisma's pgbouncer flag. Prepared statements stay uncached.
  url.searchParams.delete("pgbouncer");
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}
