import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";
import * as db from "./db";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

function getSecret() {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET || "";
  if (!secret) throw new Error("JWT_SECRET is required");
  return new TextEncoder().encode(secret);
}

export function toOpenId(email: string) {
  return `local:${email.toLowerCase().trim()}`;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload, expiresInMs = ONE_YEAR_MS) {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const { openId, appId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || !openId) return null;
    return { openId, appId: String(appId ?? ""), name: String(name ?? "") };
  } catch {
    return null;
  }
}

function getTokenFromReq(req: { headers?: Record<string, unknown>; cookies?: Record<string, string> }) {
  // cookie-parser populates req.cookies; fallback to manual parse + Authorization header
  const cookies = (req as { cookies?: Record<string, string> }).cookies;
  if (cookies?.[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const header = (req.headers as Record<string, string> | undefined);
  const cookieHeader = header?.cookie;
  if (typeof cookieHeader === "string") {
    const pair = cookieHeader.split(";").find((s) => s.trim().startsWith(`${COOKIE_NAME}=`));
    if (pair) return pair.trim().slice(COOKIE_NAME.length + 1);
  }
  const auth = header?.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return undefined;
}

export async function authenticateLocalRequest(req: unknown) {
  const token = getTokenFromReq(req as { headers?: Record<string, unknown> });
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await db.getUserByOpenId(session.openId);
  return user ?? null;
}

export async function registerLocalUser(input: { email: string; password: string; name?: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await db.getUserByEmail(email);
  if (existing) {
    const err = new Error("อีเมลนี้ถูกใช้งานแล้ว") as Error & { code?: string };
    err.code = "CONFLICT";
    throw err;
  }
  const passwordHash = await hashPassword(input.password);
  const openId = toOpenId(email);
  const isFirstAdmin = email === (process.env.OWNER_EMAIL ?? process.env.OWNER_OPEN_ID ?? "").toLowerCase();
  await db.upsertUser({
    openId,
    email,
    name: input.name?.trim() || email.split("@")[0],
    passwordHash,
    loginMethod: "password",
    role: isFirstAdmin ? "admin" : "user",
    lastSignedIn: new Date(),
  });
  const user = await db.getUserByOpenId(openId);
  if (!user) throw new Error("สมัครสมาชิกไม่สำเร็จ");
  const token = await signSession({ openId: user.openId, appId: "lexiloops", name: user.name ?? "" });
  return { user, token };
}

export async function loginLocalUser(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await db.getUserByEmail(email);
  if (!user || !user.passwordHash) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  const token = await signSession({ openId: user.openId, appId: "lexiloops", name: user.name ?? "" });
  const fresh = (await db.getUserByOpenId(user.openId)) ?? user;
  return { user: fresh, token };
}
