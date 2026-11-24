import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  isAdminAuthenticated,
  isAdminConfigured,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import { hashSecret, verifySecret } from "@/lib/crypto";
import { getGameState, getStorageMode, saveGameState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getGameState();
  const configured = isAdminConfigured(state);
  const authenticated = await isAdminAuthenticated(state);

  return NextResponse.json({
    authenticated,
    needsSetup: !configured,
    storageMode: getStorageMode(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body.password || "").trim();

    if (password.length < 4) {
      return NextResponse.json(
        { error: "La clave debe tener al menos 4 caracteres." },
        { status: 400 }
      );
    }

    const state = await getGameState();
    const configured = isAdminConfigured(state);

    if (!configured) {
      // First-time organizer password setup
      state.config.adminPinHash = hashSecret(password);
      await saveGameState(state);
      await setAdminSessionCookie(state);
      return NextResponse.json({ ok: true, created: true });
    }

    // Verify against ADMIN_PASSWORD env var or stored hash
    const envPassword = process.env.ADMIN_PASSWORD;
    const valid = envPassword
      ? password === envPassword
      : state.config.adminPinHash
        ? verifySecret(password, state.config.adminPinHash)
        : false;

    if (!valid) {
      return NextResponse.json(
        { error: "Clave incorrecta." },
        { status: 401 }
      );
    }

    await setAdminSessionCookie(state);
    return NextResponse.json({ ok: true, created: false });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Solicitud inválida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}

