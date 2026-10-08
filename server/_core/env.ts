export const ENV = {
  appId: process.env.VITE_APP_ID ?? "lexiloops",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // legacy Manus fields kept so unused _core modules still compile
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
