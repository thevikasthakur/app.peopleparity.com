// src/configure-app.ts
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";

function corsOriginFromEnv(): boolean | string[] {
  const raw = process.env.CORS_ORIGINS?.trim();

  // Defaults for local dev
  if (!raw || raw.length === 0) {
    return ["http://localhost:5173", "http://localhost:3000"];
  }

  // Allow-all flags
  if (raw === "*" || raw.toLowerCase() === "true" || raw === "1") {
    return true;
  }

  // Comma-separated list
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function configureApp(app: INestApplication) {
  const origin = corsOriginFromEnv(); // boolean | string[]

  app.enableCors({ origin, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api");

  await app.init();
  return app;
}
