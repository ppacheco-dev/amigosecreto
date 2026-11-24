import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generateId } from "@/lib/crypto";
import { getGameState, saveGameState } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const state = await getGameState();
    if (!(await isAdminAuthenticated(state))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (state.config.status === "drawn") {
      return NextResponse.json(
        { error: "Reinicia el sorteo para modificar restricciones." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const fromId = String(body.fromId || "");
    const toId = String(body.toId || "");
    const mutual = Boolean(body.mutual);

    if (!fromId || !toId || fromId === toId) {
      return NextResponse.json(
        { error: "Debes elegir dos personas distintas." },
        { status: 400 }
      );
    }

    const hasFrom = state.participants.some((p) => p.id === fromId);
    const hasTo = state.participants.some((p) => p.id === toId);
    if (!hasFrom || !hasTo) {
      return NextResponse.json(
        { error: "Participantes inválidos." },
        { status: 404 }
      );
    }

    // Check duplicate
    const duplicate = state.restrictions.find(
      (r) =>
        (r.fromId === fromId && r.toId === toId) ||
        (r.mutual && r.fromId === toId && r.toId === fromId) ||
        (mutual && r.fromId === toId && r.toId === fromId)
    );

    if (duplicate) {
      if (mutual && !duplicate.mutual) {
        duplicate.mutual = true;
        await saveGameState(state);
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json(
        { error: "Esa restricción ya existe." },
        { status: 400 }
      );
    }

    state.restrictions.push({
      id: generateId(5),
      fromId,
      toId,
      mutual,
    });

    await saveGameState(state);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo agregar la restricción." },
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
        { error: "Reinicia el sorteo para modificar restricciones." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    state.restrictions = state.restrictions.filter((r) => r.id !== id);
    await saveGameState(state);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo eliminar la restricción." },
      { status: 400 }
    );
  }
}

