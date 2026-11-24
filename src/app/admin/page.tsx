"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  HardDrive,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type { AdminParticipantSummary, Restriction } from "@/lib/types";

interface AdminStatePayload {
  config: {
    title: string;
    budget: string;
    eventDate: string;
    notes: string;
    status: "setup" | "drawn";
    drawnAt: string | null;
  };
  participants: AdminParticipantSummary[];
  restrictions: Restriction[];
  feasibility: {
    ok: boolean;
    error: string | null;
  };
  storageMode: "redis" | "local" | "unconfigured-vercel";
}

type AdminTab = "family" | "restrictions" | "draw" | "settings";

export default function AdminDashboardPage() {
  const [authStatus, setAuthStatus] = useState<{
    loading: boolean;
    authenticated: boolean;
    needsSetup: boolean;
    storageMode: "redis" | "local" | "unconfigured-vercel";
  }>({
    loading: true,
    authenticated: false,
    needsSetup: false,
    storageMode: "local",
  });

  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [state, setState] = useState<AdminStatePayload | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("family");
  const [toast, setToast] = useState<string | null>(null);

  // Add participants
  const [namesInput, setNamesInput] = useState("");
  const [addingNames, setAddingNames] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Restrictions form
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [mutual, setMutual] = useState(true);
  const [addingRestriction, setAddingRestriction] = useState(false);

  // Settings form
  const [cfgTitle, setCfgTitle] = useState("");
  const [cfgBudget, setCfgBudget] = useState("");
  const [cfgDate, setCfgDate] = useState("");
  const [cfgNotes, setCfgNotes] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Draw & reset states
  const [runningDraw, setRunningDraw] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  const fetchAdminState = useCallback(async () => {
    const res = await fetch("/api/admin/state", { cache: "no-store" });
    if (res.status === 401) {
      setAuthStatus((prev) => ({ ...prev, authenticated: false }));
      return;
    }
    const json: AdminStatePayload = await res.json();
    setState(json);
    setCfgTitle(json.config.title);
    setCfgBudget(json.config.budget);
    setCfgDate(json.config.eventDate);
    setCfgNotes(json.config.notes);
  }, []);

  useEffect(() => {
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAuthStatus({
          loading: false,
          authenticated: d.authenticated,
          needsSetup: d.needsSetup,
          storageMode: d.storageMode,
        });
        if (d.authenticated) {
          fetchAdminState();
        }
      });
  }, [fetchAdminState]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || "Clave inválida.");
        return;
      }
      setPassword("");
      setAuthStatus((prev) => ({
        ...prev,
        authenticated: true,
        needsSetup: false,
      }));
      await fetchAdminState();
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthStatus((prev) => ({ ...prev, authenticated: false }));
    setState(null);
  }

  async function handleAddParticipants(e: React.FormEvent) {
    e.preventDefault();
    const names = namesInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    setAddingNames(true);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(`⚠️ ${json.error}`);
        return;
      }
      setNamesInput("");
      await fetchAdminState();
      showToast(
        `✅ Se ${json.addedCount === 1 ? "agregó 1 familiar" : `agregaron ${json.addedCount} familiares`}`
      );
    } finally {
      setAddingNames(false);
    }
  }

  async function handleDeleteParticipant(participant: AdminParticipantSummary) {
    if (!confirm(`¿Eliminar a ${participant.name} del sorteo?`)) return;
    const res = await fetch(`/api/admin/participants?id=${participant.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json();
      showToast(`⚠️ ${json.error}`);
      return;
    }
    await fetchAdminState();
    showToast(`${participant.name} eliminado.`);
  }

  function getPersonalUrl(token: string) {
    if (typeof window === "undefined") return `/p/${token}`;
    return `${window.location.origin}/p/${token}`;
  }

  function openWhatsAppPersonal(p: AdminParticipantSummary) {
    const url = getPersonalUrl(p.secretToken);
    const budget = state?.config.budget || "$20.000";
    const text = `🎄 ¡Hola ${p.name}! Ya está listo el sorteo de nuestro *${state?.config.title}* (presupuesto ${budget}).\n\nEntra a tu enlace secreto para descubrir a quién te tocó y, si quieres, anotar qué te gustaría recibir:\n${url}\n\n🤫 ¡No compartas este enlace con nadie!`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyPersonalLink(p: AdminParticipantSummary) {
    const url = getPersonalUrl(p.secretToken);
    await navigator.clipboard.writeText(url);
    setCopiedId(p.id);
    showToast(`🔗 Enlace secreto de ${p.name} copiado.`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleAddRestriction(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) return;
    setAddingRestriction(true);
    try {
      const res = await fetch("/api/admin/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId, toId, mutual }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(`⚠️ ${json.error}`);
        return;
      }
      setToId("");
      await fetchAdminState();
      showToast("🚫 Restricción agregada.");
    } finally {
      setAddingRestriction(false);
    }
  }

  async function handleDeleteRestriction(id: string) {
    await fetch(`/api/admin/restrictions?id=${id}`, { method: "DELETE" });
    await fetchAdminState();
    showToast("Restricción eliminada.");
  }

  async function handleRunDraw() {
    if (
      !confirm(
        "¿Realizar el sorteo ahora? Nadie (ni siquiera tú) verá los resultados aquí. Luego podrás enviarle su enlace secreto por WhatsApp a cada persona."
      )
    )
      return;
    setRunningDraw(true);
    try {
      const res = await fetch("/api/admin/draw", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast(`⚠️ ${json.error}`);
        return;
      }
      await fetchAdminState();
      showToast("🎉 ¡Sorteo listo! Ya puedes enviar los enlaces por WhatsApp.");
    } finally {
      setRunningDraw(false);
    }
  }

  async function handleResetDraw() {
    if (
      !confirm(
        "⚠️ ¿Reiniciar el sorteo? Se borrarán los emparejamientos actuales, pero se conservarán los nombres y restricciones."
      )
    )
      return;
    await fetch("/api/admin/draw", { method: "DELETE" });
    await fetchAdminState();
    showToast("🔄 Sorteo reiniciado.");
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cfgTitle,
          budget: cfgBudget,
          eventDate: cfgDate,
          notes: cfgNotes,
        }),
      });
      if (res.ok) {
        await fetchAdminState();
        showToast("✅ Configuración guardada.");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleResetEverything() {
    if (
      !confirm(
        "⚠️ ¿Borrar TODO y empezar desde 0?\n\nSe eliminarán todos los participantes, enlaces secretos, deseos, restricciones y el sorteo actual (tu clave de organizador se mantendrá)."
      )
    )
      return;
    if (
      !confirm(
        "Confirmación final: esta acción no se puede deshacer. ¿Seguro que quieres dejar la aplicación completamente en blanco?"
      )
    )
      return;

    setResettingAll(true);
    try {
      const res = await fetch("/api/admin/state", { method: "DELETE" });
      if (res.ok) {
        setFromId("");
        setToId("");
        await fetchAdminState();
        setActiveTab("family");
        showToast("🧹 Todo reiniciado desde 0.");
      } else {
        showToast("⚠️ No se pudo reiniciar.");
      }
    } finally {
      setResettingAll(false);
    }
  }

  if (authStatus.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500 font-medium">Cargando panel...</p>
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-lg p-7 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mb-1.5">
            {authStatus.needsSetup
              ? "Crea tu clave de organizador"
              : "Panel del Organizador"}
          </h1>
          <p className="text-sm text-stone-600 mb-6">
            {authStatus.needsSetup
              ? "Esta clave protege el panel para cargar a tu familia, poner restricciones, sortear y enviar los links privados por WhatsApp."
              : "Ingresa tu clave de organizador para administrar el amigo secreto."}
          </p>

          {authStatus.storageMode === "unconfigured-vercel" && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Falta conectar la base de datos en Vercel
              </p>
              <p>
                Ve a tu proyecto en Vercel → <strong>Storage</strong> →{" "}
                <strong>Create Database</strong> →{" "}
                <strong>Upstash for Redis (Free)</strong>, conéctala y haz{" "}
                <strong>Redeploy</strong>.
              </p>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                authStatus.needsSetup
                  ? "Elige una clave (mín. 4 caracteres)"
                  : "Tu clave de organizador"
              }
              autoFocus
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 focus:border-emerald-700 focus:outline-none text-sm font-medium"
            />
            {authError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authSubmitting || password.trim().length < 4}
              className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-bold shadow-sm transition-colors cursor-pointer"
            >
              {authSubmitting
                ? "Entrando..."
                : authStatus.needsSetup
                  ? "Guardar clave y comenzar"
                  : "Entrar al Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const participants = state?.participants ?? [];
  const nameById = new Map(participants.map((p) => [p.id, p.name]));
  const isDrawn = state?.config.status === "drawn";
  const wishlistsCount = participants.filter((p) => p.hasWishlist).length;
  const revealedCount = participants.filter((p) => p.hasRevealed).length;

  return (
    <div className="min-h-screen pb-16">
      <div className="h-1.5 bg-gradient-to-r from-emerald-800 via-rose-600 to-amber-500" />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-bounce">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Ver portada
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900">
              Panel del Organizador 🎄
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                state?.storageMode === "redis"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {state?.storageMode === "redis" ? (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  Nube (Redis)
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5" />
                  Modo Local
                </>
              )}
            </span>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </header>

        {/* Zero-Spoiler Guarantee Banner */}
        <div className="bg-emerald-950 text-emerald-50 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 text-xs sm:text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <p>
            <strong>Modo Sin Spoilers activo:</strong> Los enlaces secretos se
            generan solos y tú puedes enviarlos por WhatsApp{" "}
            <span className="underline decoration-emerald-400">
              sin ver jamás quién le tocó a quién
            </span>
            . ¡Tú también puedes jugar!
          </p>
        </div>

        {/* Navigation Tabs (clear 1-2-3 order) */}
        <nav className="flex gap-1.5 p-1.5 bg-stone-200/70 rounded-2xl mb-7 overflow-x-auto">
          {[
            {
              id: "family" as const,
              label: `1. Familia y Links (${participants.length})`,
              icon: Users,
            },
            {
              id: "restrictions" as const,
              label: `2. Restricciones (${state?.restrictions.length ?? 0})`,
              icon: Ban,
            },
            {
              id: "draw" as const,
              label: isDrawn ? "3. Sorteo (Listo ✅)" : "3. Hacer Sorteo",
              icon: Sparkles,
            },
            {
              id: "settings" as const,
              label: "Configuración",
              icon: Settings,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-fit inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: FAMILY & WHATSAPP LINKS */}
        {activeTab === "family" && (
          <div className="space-y-6">
            {!isDrawn && (
              <form
                onSubmit={handleAddParticipants}
                className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm"
              >
                <label className="block text-sm font-bold text-stone-900 mb-1">
                  Agregar a los 8 participantes
                </label>
                <p className="text-xs text-stone-500 mb-3">
                  Escribe los nombres separados por comas (ej:{" "}
                  <em>Mamá, Papá, Pedro, Sofía, Lucas, Camila, Tío Juan, Abuela</em>
                  ). Al agregarlos, la página crea automáticamente un enlace
                  secreto único para cada uno.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={namesInput}
                    onChange={(e) => setNamesInput(e.target.value)}
                    placeholder="Ej: Mamá, Papá, Camilo, Valentina..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-stone-200 focus:border-emerald-700 focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={addingNames || !namesInput.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white text-sm font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </form>
            )}

            {participants.length > 0 && !isDrawn && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-amber-950 flex flex-wrap items-center justify-between gap-2">
                <span>
                  💡 Primero agrega a todos y configura las{" "}
                  <strong>Restricciones</strong>. Cuando hagas el{" "}
                  <strong>Sorteo</strong>, te aparecerán los botones de WhatsApp
                  listos para enviar cada enlace secreto.
                </span>
                <button
                  onClick={() => setActiveTab("restrictions")}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  Ir a Restricciones →
                </button>
              </div>
            )}

            {participants.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-10 text-center">
                <p className="text-3xl mb-2">👨‍👩‍👧‍👦</p>
                <p className="font-bold text-stone-800 mb-1">
                  Todavía no hay familiares registrados
                </p>
                <p className="text-xs text-stone-500">
                  Agrega arriba a los 8 integrantes de tu familia para empezar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-xl font-bold text-stone-900 truncate">
                          {p.name}
                        </h3>
                        {!isDrawn && (
                          <button
                            onClick={() => handleDeleteParticipant(p)}
                            title="Eliminar participante"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isDrawn && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              p.hasRevealed
                                ? "bg-rose-50 text-rose-700"
                                : "bg-stone-100 text-stone-500"
                            }`}
                          >
                            {p.hasRevealed
                              ? "👀 Ya abrió su sobre"
                              : "⏳ Aún no abre"}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              p.hasWishlist
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-stone-100 text-stone-500"
                            }`}
                          >
                            {p.hasWishlist
                              ? `🎁 Anotó deseos (${p.wishlistCount})`
                              : "Sin deseos (opcional)"}
                          </span>
                        </div>
                      )}

                      {/* Admin-only Wishlist View */}
                      {p.hasWishlist && (
                        <div className="mt-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-3 space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            🎁 Deseos (solo visible para admin)
                          </p>
                          {p.wishlist.length > 0 && (
                            <ul className="space-y-1">
                              {p.wishlist.map((w) => (
                                <li
                                  key={w.id}
                                  className="text-xs font-medium text-stone-800 flex items-start gap-1.5"
                                >
                                  <span className="text-rose-500">•</span>
                                  <span>{w.text}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {p.sizesOrNotes && (
                            <p className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/70 rounded-xl px-2.5 py-1.5">
                              <strong>Notas:</strong> {p.sizesOrNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Personal Secret Link Buttons (prominent after draw) */}
                    {isDrawn ? (
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100">
                        <button
                          onClick={() => openWhatsAppPersonal(p)}
                          className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-extrabold shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Enviar por WhatsApp
                        </button>

                        <button
                          onClick={() => copyPersonalLink(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                        >
                          {copiedId === p.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar URL
                            </>
                          )}
                        </button>

                        <a
                          href={`/p/${p.secretToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir URL
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 pt-2 border-t border-stone-100">
                        🔗 Su enlace secreto estará listo para enviar apenas
                        hagas el sorteo.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RESTRICTIONS */}
        {activeTab === "restrictions" && (
          <div className="space-y-6">
            <div
              className={`rounded-2xl p-4 border flex items-center gap-3 text-sm font-semibold ${
                state?.feasibility.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {state?.feasibility.ok ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    ¡Todo bien! Existe combinación válida para sortear con las
                    restricciones actuales.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{state?.feasibility.error}</span>
                </>
              )}
            </div>

            {!isDrawn && participants.length >= 2 && (
              <form
                onSubmit={handleAddRestriction}
                className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
              >
                <h2 className="font-bold text-stone-900">
                  Agregar regla: quién NO puede sacar a quién
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">
                      Esta persona...
                    </label>
                    <select
                      value={fromId}
                      onChange={(e) => setFromId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
                    >
                      <option value="">Elegir familiar...</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1">
                      NO puede sacarle a...
                    </label>
                    <select
                      value={toId}
                      onChange={(e) => setToId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
                    >
                      <option value="">Elegir familiar...</option>
                      {participants
                        .filter((p) => p.id !== fromId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mutual}
                    onChange={(e) => setMutual(e.target.checked)}
                    className="w-4 h-4 rounded accent-rose-600"
                  />
                  <span>
                    <strong>Mutuo</strong> (tampoco al revés — ideal para
                    parejas o matrimonios)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    addingRestriction || !fromId || !toId || fromId === toId
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white text-sm font-bold cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  Agregar restricción
                </button>
              </form>
            )}

            <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-3">
                Restricciones activas ({state?.restrictions.length ?? 0})
              </h3>

              {!state?.restrictions.length ? (
                <p className="text-sm text-stone-500">
                  No hay restricciones personalizadas aún. De forma automática,
                  nadie puede sacarse a sí mismo y{" "}
                  <strong>
                    nunca habrá cruces mutuos (si a A le toca B, a B no le
                    tocará A)
                  </strong>
                  .
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-stone-500">
                    ✅ Reglas automáticas activas: nadie se saca a sí mismo y si
                    a A le toca B, a B nunca le tocará A.
                  </p>
                  <ul className="space-y-2">
                  {state.restrictions.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900">
                          {nameById.get(r.fromId)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                          {r.mutual ? "⇄ no entre sí (mutuo)" : "↛ no saca a"}
                        </span>
                        <span className="font-bold text-stone-900">
                          {nameById.get(r.toId)}
                        </span>
                      </div>

                      {!isDrawn && (
                        <button
                          onClick={() => handleDeleteRestriction(r.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RUN DRAW */}
        {activeTab === "draw" && (
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70">
                <p className="text-xs font-bold text-stone-500">Familiares</p>
                <p className="font-serif text-2xl font-extrabold text-stone-900 mt-1">
                  {participants.length}
                </p>
              </div>
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70">
                <p className="text-xs font-bold text-stone-500">
                  Restricciones
                </p>
                <p className="font-serif text-2xl font-extrabold text-stone-900 mt-1">
                  {state?.restrictions.length ?? 0}
                </p>
              </div>
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70">
                <p className="text-xs font-bold text-stone-500">
                  {isDrawn ? "Abrieron / Con deseos" : "Presupuesto"}
                </p>
                <p className="font-serif text-2xl font-extrabold text-stone-900 mt-1">
                  {isDrawn
                    ? `${revealedCount}/${participants.length} · ${wishlistsCount} 🎁`
                    : state?.config.budget}
                </p>
              </div>
            </div>

            {!isDrawn ? (
              <div className="text-center py-4 space-y-4">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                  ¿Listo para hacer el sorteo?
                </h2>
                <p className="text-sm text-stone-600 max-w-lg mx-auto">
                  Al sortear, la app asigna en secreto a cada familiar
                  respetando todas las restricciones y activa los{" "}
                  <strong>8 enlaces individuales de WhatsApp</strong>. Después
                  cada uno podrá anotar sus deseos de forma voluntaria en su
                  mismo link.
                </p>

                {!state?.feasibility.ok && (
                  <p className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 max-w-md mx-auto">
                    ⚠️ {state?.feasibility.error}
                  </p>
                )}

                <button
                  onClick={handleRunDraw}
                  disabled={runningDraw || !state?.feasibility.ok}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-emerald-800 hover:opacity-95 disabled:opacity-40 text-white font-extrabold text-base sm:text-lg shadow-lg transition-all cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  {runningDraw ? "Sorteando..." : "🎄 Realizar Sorteo Ahora"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                  <p className="text-3xl mb-1">🎉</p>
                  <h2 className="font-serif text-2xl font-bold text-emerald-950 mb-1">
                    ¡Sorteo realizado con éxito!
                  </h2>
                  <p className="text-sm text-emerald-800 mb-4">
                    Ahora ve a <strong>1. Familia y Links</strong> y envía su
                    enlace privado por WhatsApp a cada uno de los{" "}
                    {participants.length} participantes.
                  </p>
                  <button
                    onClick={() => setActiveTab("family")}
                    className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold cursor-pointer"
                  >
                    Ver y enviar enlaces de WhatsApp →
                  </button>
                </div>

                <div className="border-t border-stone-200 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-stone-500">
                    ¿Necesitas agregar a alguien o cambiar una restricción?
                    Puedes reiniciar el sorteo sin perder los nombres ni las
                    restricciones.
                  </p>
                  <button
                    onClick={handleResetDraw}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reiniciar sorteo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            <form
              onSubmit={handleSaveSettings}
              className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Nombre del evento
                </label>
                <input
                  type="text"
                  value={cfgTitle}
                  onChange={(e) => setCfgTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Presupuesto
                  </label>
                  <input
                    type="text"
                    value={cfgBudget}
                    onChange={(e) => setCfgBudget(e.target.value)}
                    placeholder="$20.000"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Fecha de entrega
                  </label>
                  <input
                    type="text"
                    value={cfgDate}
                    onChange={(e) => setCfgDate(e.target.value)}
                    placeholder="24 de Diciembre"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Notas o reglas adicionales
                </label>
                <textarea
                  rows={3}
                  value={cfgNotes}
                  onChange={(e) => setCfgNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold cursor-pointer"
              >
                {savingSettings ? "Guardando..." : "Guardar configuración"}
              </button>
            </form>

            {/* Full Reset Card */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 className="font-bold text-base">
                  Reiniciar todo y empezar de 0
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed">
                Borra por completo todos los participantes, enlaces secretos,
                listas de deseos, restricciones y el sorteo actual para empezar
                un amigo secreto nuevo desde cero.{" "}
                <strong>Tu clave de organizador se conserva.</strong>
              </p>
              <button
                type="button"
                onClick={handleResetEverything}
                disabled={resettingAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {resettingAll
                  ? "Reiniciando todo..."
                  : "Borrar todo y empezar de 0"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
