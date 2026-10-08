export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const LOGIN_PATH = "/login";
export const REGISTER_PATH = "/register";

export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (base && base.length > 0) return base.replace(/\/+$/, "");
  return "";
}

export function getTrpcUrl(): string {
  const base = getApiBaseUrl();
  return base ? `${base}/api/trpc` : "/api/trpc";
}
