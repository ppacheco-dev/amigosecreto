import { Redis } from "@upstash/redis";
import fs from "fs/promises";
import path from "path";
import type { GameState } from "./types";

const STATE_KEY = "amigosecreto:v1:state";

const LOCAL_DIR = path.join(process.cwd(), ".data");
const LOCAL_STATE_FILE = path.join(LOCAL_DIR, "state.json");

export type StorageMode = "redis" | "local" | "unconfigured-vercel";

export function getDefaultState(): GameState {
  return {
    config: {
      title: "Amigo Secreto Familiar 🎄",
      budget: "$20.000",
      eventDate: "24 de Diciembre",
      notes:
        "Presupuesto máximo $20.000. ¡Anota tus ideas de regalo si quieres dar pistas!",
      adminPinHash: null,
      status: "setup",
      drawnAt: null,
    },
    participants: [],
    restrictions: [],
    assignments: {},
  };
}

let cachedRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;

  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    cachedRedis = new Redis({ url, token });
    return cachedRedis;
  }

  cachedRedis = null;
  return null;
}

export function getStorageMode(): StorageMode {
  if (getRedis()) return "redis";
  if (process.env.VERCEL === "1") return "unconfigured-vercel";
  return "local";
}

export async function getGameState(): Promise<GameState> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<GameState>(STATE_KEY);
    if (!raw) return getDefaultState();
    return {
      ...getDefaultState(),
      ...raw,
      config: { ...getDefaultState().config, ...raw.config },
      participants: raw.participants ?? [],
      restrictions: raw.restrictions ?? [],
      assignments: raw.assignments ?? {},
    };
  }

  if (process.env.VERCEL === "1") {
    return getDefaultState();
  }

  try {
    const content = await fs.readFile(LOCAL_STATE_FILE, "utf8");
    const parsed = JSON.parse(content) as GameState;
    return {
      ...getDefaultState(),
      ...parsed,
      config: { ...getDefaultState().config, ...parsed.config },
      participants: parsed.participants ?? [],
      restrictions: parsed.restrictions ?? [],
      assignments: parsed.assignments ?? {},
    };
  } catch {
    return getDefaultState();
  }
}

export async function saveGameState(state: GameState): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(STATE_KEY, state);
    return;
  }

  if (process.env.VERCEL === "1") {
    throw new Error(
      "Falta conectar Upstash Redis en Vercel: ve a tu proyecto → Storage → Create Database → Upstash for Redis (Free) y luego haz Redeploy."
    );
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}
