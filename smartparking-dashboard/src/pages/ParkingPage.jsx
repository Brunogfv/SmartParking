// ============================================================
// ParkingPage - tela principal: mapa do estacionamento + SmartBot
// ============================================================
import { useState, useCallback } from "react";
import { usePolling } from "../hooks/usePolling";
import { buscarHistorico } from "../services/api";
import ParkingLotMap from "../components/parking/ParkingLotMap";
import SpotDetail from "../components/parking/SpotDetail";
import SmartBot from "../components/smartbot/SmartBot";

function AcontecimentosRecentes({ dados }) {
  const registros = dados?.historico || [];
  if (registros.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">Sem acontecimentos ainda.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {registros.slice(0, 5).map((r) => {
        const liberada = !r.ocupada;
        return (
          <li
            key={r.id}
            className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2 text-xs"
          >
            <span>{liberada ? "🟢" : "🔴"}</span>
            <span className="flex-1 text-slate-300">
              <b>{r.codigo}</b> {liberada ? "foi liberada" : "ficou ocupada"}
            </span>
            <span className="tabular-nums text-slate-500">
              {new Date(r.timestamp).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ParkingPage({ vagasPolling, aoNavegar }) {
  const historico = usePolling(buscarHistorico, 3000, 5000);

  const [vagaSelecionada, setVagaSelecionada] = useState(null);

  const conectado = !vagasPolling.erro;
  const listaVagas = vagasPolling.dados?.vagas || [];

  // Mantem a identidade da funcao estavel (evita reset do intervalo)
  const verHistorico = useCallback(() => {
    setVagaSelecionada(null);
    aoNavegar("historico");
  }, [aoNavegar]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        {/* MAPA - protagonista */}
        <ParkingLotMap
          vagas={listaVagas}
          conectado={conectado}
          aoSelecionar={setVagaSelecionada}
        />

        {/* Coluna lateral: SmartBot + acontecimentos */}
        <div className="space-y-4">
          <SmartBot
            vagas={listaVagas}
            conectado={conectado}
            historico={historico.dados?.historico}
          />

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/30">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-200">
              ⚡ Acontecimentos recentes
            </h3>
            <AcontecimentosRecentes dados={historico.dados} />
          </section>
        </div>
      </div>

      {/* Painel de detalhes da vaga clicada */}
      <SpotDetail
        vaga={vagaSelecionada}
        aoFechar={() => setVagaSelecionada(null)}
        aoVerHistorico={verHistorico}
      />
    </div>
  );
}