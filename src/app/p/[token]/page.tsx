"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Gift,
  Heart,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import type { WishItem } from "@/lib/types";

interface MePayload {
  config: {
    title: string;
    budget: string;
    eventDate: string;
    notes: string;
    status: "setup" | "drawn";
    drawnAt: string | null;
  };
  me: {
    id: string;
    name: string;
    wishlist: WishItem[];
    sizesOrNotes: string;
    hasRevealed: boolean;
    revealedAt: string | null;
  };
  assignedTarget: null | {
    locked: boolean;
    name?: string;
    wishlist?: WishItem[];
    sizesOrNotes?: string;
  };
}

export default function ParticipantPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reveal states
  const [revealing, setRevealing] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [privacyHidden, setPrivacyHidden] = useState(false);

  // Wishlist editor states (auto-saved)
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [newWishText, setNewWishText] = useState("");
  const [sizesOrNotes, setSizesOrNotes] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/me/${token}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No pudimos encontrar tu invitación.");
        return;
      }
      setData(json);
      setWishlist(json.me.wishlist || []);
      setSizesOrNotes(json.me.sizesOrNotes || "");
    } catch {
      setError("Error al cargar tu espacio. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, [loadData]);

  function fireCelebrationConfetti() {
    const colors = ["#be123c", "#15803d", "#f59e0b", "#fbbf24", "#ffffff"];
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.55 },
      colors,
    });
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.1, y: 0.65 },
        colors,
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.9, y: 0.65 },
        colors,
      });
    }, 280);
  }

  async function handleReveal() {
    setRevealing(true);
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`/api/me/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal" }),
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setJustRevealed(true);
        setPrivacyHidden(false);
        fireCelebrationConfetti();
      }
    } finally {
      setRevealing(false);
    }
  }

  const persistWishlist = useCallback(
    async (nextWishlist: WishItem[], nextNotes: string) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/me/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateWishlist",
            wishlist: nextWishlist,
            sizesOrNotes: nextNotes,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          setData(json);
          setWishlist(json.me.wishlist || []);
          setSaveState("saved");
          setTimeout(() => {
            setSaveState((curr) => (curr === "saved" ? "idle" : curr));
          }, 2500);
        } else {
          setSaveState("idle");
        }
      } catch {
        setSaveState("idle");
      }
    },
    [token]
  );

  async function handleAddWishItem(e?: React.FormEvent) {
    e?.preventDefault();
    const text = newWishText.trim();
    if (!text) return;

    const nextWishlist: WishItem[] = [
      ...wishlist,
      { id: Math.random().toString(36).slice(2, 9), text },
    ];
    setWishlist(nextWishlist);
    setNewWishText("");
    await persistWishlist(nextWishlist, sizesOrNotes);
  }

  async function handleRemoveWishItem(id: string) {
    const nextWishlist = wishlist.filter((item) => item.id !== id);
    setWishlist(nextWishlist);
    await persistWishlist(nextWishlist, sizesOrNotes);
  }

  function handleNotesChange(value: string) {
    setSizesOrNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      persistWishlist(wishlist, value);
    }, 700);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
            <Gift className="w-7 h-7" />
          </div>
          <p className="text-stone-600 font-medium">
            Abriendo tu enlace secreto...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-stone-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm">
          <p className="text-4xl mb-3">🎄</p>
          <h1 className="font-serif text-2xl font-bold text-stone-900 mb-2">
            Enlace no encontrado
          </h1>
          <p className="text-stone-600 text-sm mb-6">
            {error ||
              "Verifica que el link que recibiste por WhatsApp esté completo."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-800 text-white font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="h-1.5 bg-gradient-to-r from-emerald-800 via-rose-600 to-amber-500" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-7">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            {data.config.title}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            Presupuesto: {data.config.budget}
          </span>
        </div>

        {/* Greeting */}
        <header>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900">
            ¡Hola, {data.me.name}! 👋
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Este es tu enlace personal y secreto. Puedes volver a entrar las
            veces que quieras.
          </p>
        </header>

        {/* SECTION 1: SECRET SANTA REVEAL */}
        <section className="rounded-3xl overflow-hidden border border-stone-200/90 shadow-md bg-white">
          {data.config.status === "setup" ? (
            <div className="p-7 sm:p-9 text-center bg-gradient-to-b from-emerald-50/70 to-white">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 animate-float-slow">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">
                El sorteo todavía no se realiza
              </h2>
              <p className="text-stone-600 text-sm sm:text-base max-w-md mx-auto">
                Apenas el organizador haga el sorteo, podrás entrar a este mismo
                enlace para ver quién te tocó.
              </p>
            </div>
          ) : data.assignedTarget?.locked ? (
            <div className="p-8 sm:p-11 text-center bg-gradient-to-br from-rose-700 via-rose-800 to-emerald-950 text-white relative overflow-hidden">
              <div className="relative z-10 max-w-md mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-amber-200 text-xs font-bold uppercase tracking-wider mb-5">
                  ✨ ¡El sorteo ya está listo!
                </span>

                <div
                  className={`w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-300 to-amber-500 text-rose-950 flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white/30 ${
                    revealing ? "animate-gift-wiggle" : "animate-float-slow"
                  }`}
                >
                  <Gift className="w-14 h-14" />
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl font-extrabold mb-3">
                  {revealing
                    ? "Abriendo tu sobre..."
                    : "¿Listo para saber quién te tocó?"}
                </h2>
                <p className="text-rose-100 text-sm sm:text-base mb-7">
                  👀 Asegúrate de que nadie esté mirando tu pantalla antes de
                  abrir.
                </p>

                <button
                  onClick={handleReveal}
                  disabled={revealing}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-rose-950 font-extrabold text-base sm:text-lg shadow-xl transition-all cursor-pointer disabled:opacity-80"
                >
                  {revealing
                    ? "🥁 Redoble de tambores..."
                    : "🎁 ¡Abrir y descubrir mi Amigo Secreto!"}
                </button>
              </div>
            </div>
          ) : data.assignedTarget && !data.assignedTarget.locked ? (
            <div>
              {/* Header Bar with Privacy Toggle */}
              <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-rose-800 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-300" />
                  <span className="font-bold text-sm sm:text-base">
                    Tu Amigo Secreto
                  </span>
                </div>

                <button
                  onClick={() => setPrivacyHidden((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {privacyHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Mostrar de nuevo
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Ocultar pantalla
                    </>
                  )}
                </button>
              </div>

              {privacyHidden ? (
                <div className="p-10 text-center bg-stone-50">
                  <p className="text-3xl mb-2">🙈</p>
                  <p className="font-bold text-stone-800 mb-1">
                    Modo anti-espías activado
                  </p>
                  <p className="text-xs text-stone-500 mb-4">
                    Tu amigo secreto está oculto por si hay alguien cerca.
                  </p>
                  <button
                    onClick={() => setPrivacyHidden(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-sm font-bold cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    Volver a ver
                  </button>
                </div>
              ) : (
                <div className="p-6 sm:p-8 bg-gradient-to-b from-amber-50/40 via-white to-white">
                  {/* Festive Reveal Ticket */}
                  <div className="flex flex-col items-center text-center mb-8">
                    <div
                      className={`w-full max-w-md rounded-3xl bg-gradient-to-br from-rose-50 via-white to-amber-50 border-2 border-amber-300/80 shadow-lg px-6 py-8 ${
                        justRevealed ? "animate-polaroid-pop" : ""
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                        <Gift className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-2">
                        🎉 ¡Te tocó regalarle a...!
                      </p>
                      <h3 className="font-serif text-4xl sm:text-5xl font-extrabold text-stone-900 leading-tight mb-4">
                        {data.assignedTarget.name}
                      </h3>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                        <Wallet className="w-3.5 h-3.5" />
                        Presupuesto: {data.config.budget}
                      </div>
                    </div>
                  </div>

                  {/* Target's Live Wishlist */}
                  <div className="bg-stone-50/90 border border-stone-200/80 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="w-5 h-5 text-rose-600" />
                      <h4 className="font-bold text-stone-900">
                        Ideas de regalo de {data.assignedTarget.name}
                      </h4>
                    </div>

                    {data.assignedTarget.wishlist &&
                    data.assignedTarget.wishlist.length > 0 ? (
                      <ul className="space-y-2.5 mb-4">
                        {data.assignedTarget.wishlist.map((item) => (
                          <li
                            key={item.id}
                            className="bg-white rounded-xl p-3.5 border border-stone-200/80 text-sm font-medium text-stone-800"
                          >
                            🎁 {item.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-500 italic mb-3">
                        Todavía no anota ideas (es voluntario). Puedes volver a
                        entrar a este enlace más adelante para ver si agregó
                        algo.
                      </p>
                    )}

                    {data.assignedTarget.sizesOrNotes && (
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-sm text-amber-950">
                        <span className="font-bold block text-xs uppercase tracking-wider text-amber-800 mb-1">
                          Tallas, gustos o notas importantes:
                        </span>
                        {data.assignedTarget.sizesOrNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* SECTION 2: MY OWN VOLUNTARY WISHLIST (AUTO-SAVED) */}
        <section className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="font-serif text-2xl font-bold text-stone-900">
                  🎁 Mis Ideas de Regalo
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-bold">
                  Opcional
                </span>
              </div>
              <p className="text-sm text-stone-600">
                Si quieres darle pistas a quien le hayas tocado (presupuesto{" "}
                <strong>{data.config.budget}</strong>), anótalas aquí. Todo se
                guarda automáticamente.
              </p>
            </div>

            {saveState !== "idle" && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  saveState === "saving"
                    ? "bg-stone-100 text-stone-600"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {saveState === "saving" ? (
                  "Guardando..."
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Guardado
                  </>
                )}
              </span>
            )}
          </div>

          {wishlist.length > 0 && (
            <ul className="space-y-2.5 mb-5">
              {wishlist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-3"
                >
                  <p className="text-sm font-semibold text-stone-900 break-words">
                    ✨ {item.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveWishItem(item.id)}
                    aria-label="Eliminar idea"
                    className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add new wish item (single input, auto-saves on submit) */}
          <form
            onSubmit={handleAddWishItem}
            className="flex flex-col sm:flex-row gap-2 mb-5"
          >
            <input
              type="text"
              value={newWishText}
              onChange={(e) => setNewWishText(e.target.value)}
              placeholder="Ej: Un termo bonito, chocolates amargos, polera negra..."
              className="flex-1 text-sm px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-rose-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newWishText.trim() || saveState === "saving"}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agregar idea
            </button>
          </form>

          {/* Sizes / Notes (auto-saves while typing) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Tallas, colores favoritos o qué NO regalarme (opcional)
            </label>
            <textarea
              rows={3}
              value={sizesOrNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={() => {
                if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
                persistWishlist(wishlist, sizesOrNotes);
              }}
              placeholder="Ej: Polera talla M, calcetines entretenidos sí, perfumes fuertes no..."
              className="w-full text-sm px-4 py-3 rounded-2xl border border-stone-200 focus:border-emerald-600 focus:outline-none resize-none"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
