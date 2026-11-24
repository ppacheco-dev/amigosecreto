import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generateId, generateSecretToken } from "@/lib/crypto";
import { getGameState, saveGameState } from "@/lib/store";
import type { Participant } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const state = await getGameState();
    if (!(await isAdminAuthenticated(state))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (state.config.status === "drawn") {
      return NextResponse.json(
        {
          error:
            "El sorteo ya fue realizado. Reinicia el sorteo si necesitas agregar participantes.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rawNames: string[] = Array.isArray(body.names)
      ? body.names
      : typeof body.name === "string"
        ? [body.name]
        : [];

    const existingNames = new Set(
      state.participants.map((p) => p.name.toLowerCase())
    );
    const added: Participant[] = [];

    for (const raw of rawNames) {
      const name = String(raw || "").trim().slice(0, 40);
      if (!name) continue;
      if (existingNames.has(name.toLowerCase())) continue;

      const participant: Participant = {
        id: generateId(6),
        name,
        secretToken: generateSecretToken(),
        wishlist: [],
        sizesOrNotes: "",
        hasRevealed: false,
        revealedAt: null,
        wishlistUpdatedAt: null,
        createdAt: new Date().toISOString(),
      };
      state.participants.push(participant);
      existingNames.add(name.toLowerCase());
      added.push(participant);
    }

    if (added.length === 0) {
      return NextResponse.json(
        { error: "Ingresa al menos un nombre nuevo válido." },
        { status: 400 }
      );
    }

    await saveGameState(state);
    return NextResponse.json({ ok: true, addedCount: added.length });
  } catch {
    return NextResponse.json(
      { error: "No se pudo agregar al participante." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const state = await getGameState();
    if (!(await isAdminAuthenticated(state))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body.id || "");
    const participant = state.participants.find((p) => p.id === id);

    if (!participant) {
      return NextResponse.json(
        { error: "Participante no encontrado." },
        { status: 404 }
      );
    }

    if (typeof body.name === "string" && body.name.trim()) {
      participant.name = body.name.trim().slice(0, 40);
    }

    await saveGameState(state);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar el participante." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const state = await getGameState();
    if (!(await isAdminAuthenticated(state))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (state.config.status === "drawn") {
      return NextResponse.json(
        {
          error: "Reinicia el sorteo antes de eliminar participantes.",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    const idx = state.participants.findIndex((p) => p.id === id);

    if (idx === -1) {
      return NextResponse.json(
        { error: "Participante no encontrado." },
        { status: 404 }
      );
    }

    state.participants.splice(idx, 1);
    state.restrictions = state.restrictions.filter(
      (r) => r.fromId !== id && r.toId !== id
    );
    await saveGameState(state);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo eliminar al participante." },
      { status: 400 }
    );
  }
}
