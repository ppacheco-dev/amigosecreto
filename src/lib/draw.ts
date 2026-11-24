import crypto from "crypto";
import type { Participant, Restriction } from "./types";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface DrawResult {
  ok: boolean;
  assignments?: Record<string, string>;
  error?: string;
}

export function buildForbiddenMap(
  participantIds: string[],
  restrictions: Restriction[]
): Map<string, Set<string>> {
  const validSet = new Set(participantIds);
  const forbidden = new Map<string, Set<string>>();

  for (const id of participantIds) {
    forbidden.set(id, new Set([id])); // Never draw yourself
  }

  for (const r of restrictions) {
    if (!validSet.has(r.fromId) || !validSet.has(r.toId)) continue;
    forbidden.get(r.fromId)?.add(r.toId);
    if (r.mutual) {
      forbidden.get(r.toId)?.add(r.fromId);
    }
  }

  return forbidden;
}

/**
 * Generates a uniformly randomized valid Secret Santa assignment respecting all restrictions.
 * Uses randomized Minimum Remaining Values (MRV) backtracking.
 */
export function runSecretSantaDraw(
  participants: Pick<Participant, "id" | "name">[],
  restrictions: Restriction[]
): DrawResult {
  const n = participants.length;
  if (n < 3) {
    return {
      ok: false,
      error: "Necesitas al menos 3 participantes para hacer el sorteo.",
    };
  }

  const ids = participants.map((p) => p.id);
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const forbidden = buildForbiddenMap(ids, restrictions);

  // Build allowed receivers for each giver (shuffled for randomness)
  const allowed = new Map<string, string[]>();
  for (const id of ids) {
    const forb = forbidden.get(id)!;
    const candidates = ids.filter((target) => !forb.has(target));
    if (candidates.length === 0) {
      return {
        ok: false,
        error: `${nameById.get(id)} tiene demasiadas restricciones y no puede sacarle a nadie.`,
      };
    }
    allowed.set(id, shuffle(candidates));
  }

  // Also ensure every receiver can be picked by at least one giver
  for (const receiverId of ids) {
    const possibleGivers = ids.filter(
      (giverId) => !forbidden.get(giverId)!.has(receiverId)
    );
    if (possibleGivers.length === 0) {
      return {
        ok: false,
        error: `Nadie puede sacarle a ${nameById.get(receiverId)} por las restricciones actuales.`,
      };
    }
  }

  const assignment: Record<string, string> = {};
  const usedReceivers = new Set<string>();
  const unassigned = new Set<string>(ids);

  // Guard against pathological worst-case inputs
  let steps = 0;
  const MAX_STEPS = 200_000;

  function backtrack(): boolean {
    if (unassigned.size === 0) return true;
    steps++;
    if (steps > MAX_STEPS) return false;

    // Pick unassigned giver with fewest available receivers (MRV heuristic)
    let bestGiver: string | null = null;
    let bestCandidates: string[] = [];

    // Randomize tie-breaking by iterating in shuffled order
    const remaining = shuffle(Array.from(unassigned));
    for (const giverId of remaining) {
      const avail = allowed
        .get(giverId)!
        .filter((r) => !usedReceivers.has(r));
      if (avail.length === 0) return false; // Dead end early pruning
      if (bestGiver === null || avail.length < bestCandidates.length) {
        bestGiver = giverId;
        bestCandidates = avail;
        if (avail.length === 1) break;
      }
    }

    if (!bestGiver) return false;

    unassigned.delete(bestGiver);
    for (const receiverId of shuffle(bestCandidates)) {
      assignment[bestGiver] = receiverId;
      usedReceivers.add(receiverId);

      if (backtrack()) return true;

      usedReceivers.delete(receiverId);
      delete assignment[bestGiver];
    }
    unassigned.add(bestGiver);
    return false;
  }

  if (backtrack()) {
    return { ok: true, assignments: assignment };
  }

  return {
    ok: false,
    error:
      "No existe una combinación válida con las restricciones actuales. Prueba quitando alguna restricción.",
  };
}

