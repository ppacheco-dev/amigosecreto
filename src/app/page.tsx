"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Gift,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

interface PublicData {
  config: {
    title: string;
    budget: string;
    eventDate: string;
    notes: string;
    status: "setup" | "drawn";
    drawnAt: string | null;
  };
  participantCount: number;
}

export default function HomePage() {
  const [data, setData] = useState<PublicData | null>(null);

  useEffect(() => {
    fetch("/api/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-emerald-800 via-rose-600 to-amber-500" />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/10 text-emerald-900 text-xs sm:text-sm font-semibold mb-5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Acceso privado por enlace personal</span>
          </div>

          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center mx-auto mb-6 shadow-xl animate-float-slow">
            <Gift className="w-10 h-10" />
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight mb-4">
            {data?.config.title || "Amigo Secreto Familiar 🎄"}
          </h1>

          {/* Budget & Date Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-7">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-amber-200 shadow-sm text-sm font-bold text-amber-900">
              <Wallet className="w-4 h-4 text-amber-600" />
              Presupuesto: {data?.config.budget || "$20.000"}
            </span>
            {data?.config.eventDate && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-rose-200 shadow-sm text-sm font-semibold text-rose-900">
                <Calendar className="w-4 h-4 text-rose-600" />
                {data.config.eventDate}
              </span>
            )}
            {data && data.participantCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-emerald-200 shadow-sm text-sm font-semibold text-emerald-900">
                <Users className="w-4 h-4 text-emerald-700" />
                {data.participantCount} participantes
              </span>
            )}
          </div>

          {/* Instructions Card */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-stone-900 text-base mb-1">
                  ¿Cómo entrar a tu espacio?
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Revisa tu <strong>WhatsApp</strong> y abre el{" "}
                  <strong>enlace secreto personal</strong> que te envió el
                  organizador. No necesitas contraseñas ni crear cuenta.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 text-xs sm:text-sm text-stone-600 space-y-1.5 border border-stone-200/70">
              <p>
                🎁 <strong>En tu enlace privado podrás:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Descubrir quién te tocó en el sorteo.</li>
                <li>
                  Anotar qué te gustaría recibir{" "}
                  <span className="text-stone-500">(totalmente opcional)</span>.
                </li>
                <li>
                  Ver las ideas de regalo que haya anotado tu amigo secreto.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-7">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Soy el organizador · Entrar al Panel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
