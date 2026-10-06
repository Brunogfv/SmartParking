// ============================================================
// HistoryPage - linha do tempo (PostgreSQL) + eventos brutos (MongoDB)
// ============================================================
import { useCallback } from "react";
import { usePolling } from "../hooks/usePolling";
import { buscarHistorico, buscarEventos } from "../services/api";
import EventTimeline from "../components/history/EventTimeline";
import RawEvents from "../components/history/RawEvents";

export default function HistoryPage() {
  // Funcoes estaveis com limite maior (20 registros)
  const historico20 = useCallback(() => buscarHistorico(20), []);
  const eventos20 = useCallback(() => buscarEventos(20), []);

  const historico = usePolling(historico20, 3000, 5000);
  const eventos = usePolling(eventos20, 3000, 5000);

  return (
    <div className="space-y-4">
      <section className="subir-suave rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">📜</span> Histórico de Eventos
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Cada mudança de estado das vagas fica registrada no PostgreSQL
          (histórico relacional) e cada requisição do ESP32 vira um evento bruto
          no MongoDB.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EventTimeline
          dados={historico.dados}
          carregando={historico.carregando}
          erro={historico.erro}
          tentarNovamente={historico.tentarNovamente}
        />
        <RawEvents
          dados={eventos.dados}
          carregando={eventos.carregando}
          erro={eventos.erro}
          tentarNovamente={eventos.tentarNovamente}
        />
      </div>
    </div>
  );
}