// ============================================================
// SmartBotPage - o assistente em destaque
// ============================================================
import { usePolling } from "../hooks/usePolling";
import { buscarHistorico } from "../services/api";
import SmartBot from "../components/smartbot/SmartBot";

export default function SmartBotPage({ vagasPolling, aoNavegar }) {
  const historico = usePolling(buscarHistorico, 3000, 5000);
  const conectado = !vagasPolling.erro;
  const listaVagas = vagasPolling.dados?.vagas || [];

  return (
    <div className="space-y-4">
      <section className="subir-suave rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30 md:p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🤖</span> SmartBot
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          O assistente visual do estacionamento. Ele reage em tempo real ao estado
          das vagas, da mesma forma que o robô da maquete.
        </p>

        <div className="mt-6">
          <SmartBot
            vagas={listaVagas}
            conectado={conectado}
            historico={historico.dados?.historico}
            grande
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icone: "🟢", titulo: "Vagas livres", texto: "bot avisa quantas vagas estão disponíveis" },
            { icone: "🔴", titulo: "Lotado", texto: "bot avisa quando o estacionamento lota" },
            { icone: "⚡", titulo: "Novidades", texto: "bot comenta a última mudança de vaga" }
          ].map((item) => (
            <div
              key={item.titulo}
              className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4"
            >
              <p className="text-2xl">{item.icone}</p>
              <p className="mt-2 text-sm font-bold text-slate-200">{item.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.texto}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {listaVagas.map((vaga) => (
            <button
              key={vaga.id}
              onClick={() => aoNavegar("estacionamento")}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition hover:brightness-110 ${
                vaga.ocupada
                  ? "border-red-500/40 bg-red-500/15 text-red-300"
                  : vaga.preferencial
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {vaga.id}
              {vaga.preferencial && " ♿"}
              <span className="text-[10px] uppercase">{vaga.ocupada ? "ocupada" : "livre"}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}