import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { runSecretSantaDraw } from "@/lib/draw";
import { getGameState, saveGameState } from "@/lib/store";

export async function POST() {
  const state = await getGameState();
  if (!(await isAdminAuthenticated(state))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = runSecretSantaDraw(state.participants, state.restrictions);
  if (!result.ok || !result.assignments) {
    return NextResponse.json(
      { error: result.error || "No se pudo realizar el sorteo." },
      { status: 400 }
    );
  }

  state.assignments = result.assignments;
  state.config.status = "drawn";
  state.config.drawnAt = new Date().toISOString();
  for (const p of state.participants) {
    p.hasRevealed = false;
    p.revealedAt = null;
  }

  await saveGameState(state);

  // ZERO SPOILERS: Never return assignments!
  return NextResponse.json({
    ok: true,
    drawnAt: state.config.drawnAt,
  });
}

export async function DELETE() {
  const state = await getGameState();
  if (!(await isAdminAuthenticated(state))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  state.assignments = {};
  state.config.status = "setup";
  state.config.drawnAt = null;
  for (const p of state.participants) {
    p.hasRevealed = false;
    p.revealedAt = null;
  }

  await saveGameState(state);
  return NextResponse.json({ ok: true });
}

