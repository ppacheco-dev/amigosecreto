import { NextResponse } from "next/server";
import { generateId } from "@/lib/crypto";
import { getGameState, saveGameState } from "@/lib/store";
import type { GameState, Participant, WishItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildParticipantPayload(state: GameState, me: Participant) {
  let assignedTarget: null | {
    locked: boolean;
    name?: string;
    wishlist?: WishItem[];
    sizesOrNotes?: string;
  } = null;

  if (state.config.status === "drawn") {
    const targetId = state.assignments[me.id];
    const target = state.participants.find((p) => p.id === targetId);
    if (target) {
      if (!me.hasRevealed) {
        assignedTarget = { locked: true };
      } else {
        assignedTarget = {
          locked: false,
          name: target.name,
          wishlist: target.wishlist,
          sizesOrNotes: target.sizesOrNotes,
        };
      }
    }
  }

  return {
    config: {
      title: state.config.title,
      budget: state.config.budget,
      eventDate: state.config.eventDate,
      notes: state.config.notes,
      status: state.config.status,
      drawnAt: state.config.drawnAt,
    },
    me: {
      id: me.id,
      name: me.name,
      wishlist: me.wishlist,
      sizesOrNotes: me.sizesOrNotes,
      hasRevealed: me.hasRevealed,
      revealedAt: me.revealedAt,
    },
    assignedTarget,
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const state = await getGameState();
  const me = state.participants.find((p) => p.secretToken === token);

  if (!me) {
    return NextResponse.json(
      { error: "Enlace secreto no válido o expirado." },
      { status: 404 }
    );
  }

  return NextResponse.json(buildParticipantPayload(state, me));
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const state = await getGameState();
    const me = state.participants.find((p) => p.secretToken === token);

    if (!me) {
      return NextResponse.json(
        { error: "Enlace secreto no válido." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const action = String(body.action || "");

    if (action === "updateWishlist") {
      const rawItems = Array.isArray(body.wishlist) ? body.wishlist : [];
      const sanitized: WishItem[] = rawItems
        .slice(0, 15)
        .map((item: { id?: string; text?: string }) => ({
          id: item?.id ? String(item.id) : generateId(4),
          text: String(item?.text || "").trim().slice(0, 160),
        }))
        .filter((i: WishItem) => i.text.length > 0);

      me.wishlist = sanitized;
      me.sizesOrNotes = String(body.sizesOrNotes || "").trim().slice(0, 500);
      me.wishlistUpdatedAt = new Date().toISOString();
      await saveGameState(state);
    } else if (action === "reveal") {
      if (state.config.status !== "drawn") {
        return NextResponse.json(
          { error: "El sorteo todavía no se ha realizado." },
          { status: 400 }
        );
      }
      if (!me.hasRevealed) {
        me.hasRevealed = true;
        me.revealedAt = new Date().toISOString();
        await saveGameState(state);
      }
    } else {
      return NextResponse.json(
        { error: "Acción no reconocida." },
        { status: 400 }
      );
    }

    return NextResponse.json(buildParticipantPayload(state, me));
  } catch {
    return NextResponse.json(
      { error: "Error procesando tu solicitud." },
      { status: 400 }
    );
  }
}
