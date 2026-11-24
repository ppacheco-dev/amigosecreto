import { cookies } from "next/headers";
import { signAdminCookie, verifyAdminCookie } from "./crypto";
import type { GameState } from "./types";

export const ADMIN_COOKIE_NAME = "amigosecreto_admin";

function getSigningKey(state: GameState): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    state.config.adminPinHash ||
    "fallback-dev-key"
  );
}

export function isAdminConfigured(state: GameState): boolean {
  return Boolean(process.env.ADMIN_PASSWORD || state.config.adminPinHash);
}

export async function isAdminAuthenticated(state: GameState): Promise<boolean> {
  if (!isAdminConfigured(state)) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminCookie(token, getSigningKey(state));
}

export async function setAdminSessionCookie(state: GameState): Promise<void> {
  const cookieStore = await cookies();
  const signed = signAdminCookie(getSigningKey(state));
  cookieStore.set(ADMIN_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

