// ============================================================
// StatusBar - barra superior: marca, estado do sistema, relogio
// ============================================================
import { useEffect, useState } from "react";

export default function StatusBar({ conectado, lotado }) {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        {/* Marca */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-xl shadow-lg shadow-emerald-500/20">
            🅿️
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight tracking-tight">
              SMARTPARKING
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-500">
              Smart Parking &middot; IoT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Relogio (so no desktop para nao poluir o mobile) */}
          <span className="hidden text-sm tabular-nums text-slate-400 md:block">
            {agora.toLocaleDateString("pt-BR")} {agora.toLocaleTimeString("pt-BR")}
          </span>

          {/* LOTADO / LIVRE */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              lotado
                ? "animate-pulse bg-red-600 text-white"
                : "bg-emerald-500/15 text-emerald-300"
            }`}
          >
            {lotado ? "Lotado" : "Livre"}
          </span>

          {/* Sistema online */}
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              conectado
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${conectado ? "bg-emerald-400 ponto-online" : "bg-red-500"}`}
            />
            {conectado ? "SISTEMA ONLINE" : "DESCONECTADO"}
          </span>
        </div>
      </div>
    </header>
  );
}