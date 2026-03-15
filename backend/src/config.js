import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 8080),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  yandexClientId: process.env.YANDEX_CLIENT_ID || "",
  yandexClientSecret: process.env.YANDEX_CLIENT_SECRET || "",
  yandexRedirectUri: process.env.YANDEX_REDIRECT_URI || ""
};

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
