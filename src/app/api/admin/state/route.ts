import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { runSecretSantaDraw } from "@/lib/draw";
import { getGameState, getStorageMode, saveGameState } from "@/lib/store";
import type { AdminParticipantSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getGameState();
  if (!(await isAdminAuthenticated(state))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const participants: AdminParticipantSummary[] = state.participants.map(
    (p) => ({
      id: p.id,
      name: p.name,
      secretToken: p.secretToken,
      hasWishlist:
        p.wishlist.length > 0 || p.sizesOrNotes.trim().length > 0,
      wishlistCount: p.wishlist.length,
      hasRevealed: p.hasRevealed,
      revealedAt: p.revealedAt,
      wishlistUpdatedAt: p.wishlistUpdatedAt,
    })
  );

  // Check draw feasibility WITHOUT returning any assignments (zero spoilers!)
  const check =
    state.participants.length >= 3
      ? runSecretSantaDraw(state.participants, state.restrictions)
      : {
          ok: false,
          error: "Agrega al menos 3 participantes para poder sortear.",
        };

  return NextResponse.json({
    config: {
      title: state.config.title,
      budget: state.config.budget,
      eventDate: state.config.eventDate,
      notes: state.config.notes,
      status: state.config.status,
      drawnAt: state.config.drawnAt,
    },
    participants,
    restrictions: state.restrictions,
    feasibility: {
      ok: check.ok,
      error: check.ok ? null : check.error,
    },
    storageMode: getStorageMode(),
  });
}

export async function PATCH(req: Request) {
  try {
    const state = await getGameState();
    if (!(await isAdminAuthenticated(state))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    if (typeof body.title === "string" && body.title.trim()) {
      state.config.title = body.title.trim().slice(0, 80);
    }
    if (typeof body.budget === "string") {
      state.config.budget = body.budget.trim().slice(0, 40);
    }
    if (typeof body.eventDate === "string") {
      state.config.eventDate = body.eventDate.trim().slice(0, 60);
    }
    if (typeof body.notes === "string") {
      state.config.notes = body.notes.trim().slice(0, 400);
    }

    await saveGameState(state);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la configuración." },
      { status: 400 }
    );
  }
}
