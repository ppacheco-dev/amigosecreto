import { NextResponse } from "next/server";
import { getGameState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getGameState();

  return NextResponse.json({
    config: {
      title: state.config.title,
      budget: state.config.budget,
      eventDate: state.config.eventDate,
      notes: state.config.notes,
      status: state.config.status,
      drawnAt: state.config.drawnAt,
    },
    participantCount: state.participants.length,
  });
}
