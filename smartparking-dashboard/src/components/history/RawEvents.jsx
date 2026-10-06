// ============================================================
// RawEvents - eventos brutos recebidos do ESP32 (MongoDB)
// ============================================================

function formatarTempo(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("pt-BR");
}

export default function RawEvents({ dados, carregando, erro, tentarNovamente }) {
  const eventos = dados?.eventos || [];

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/30 md:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span>📡</span> Eventos brutos
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wider text-slate-400">
          MongoDB
        </span>
      </h2>

      {carregando && !dados ? (
        <p className="py-6 text-center text-sm text-slate-500">Carregando eventos...</p>
      ) : erro && !dados ? (
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-center">
          <p className="text-sm text-red-300">{erro}</p>
          <button
            onClick={tentarNovamente}
            className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
          >
            Tentar novamente
          </button>
        </div>
      ) : eventos.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Nenhum evento recebido. Rode o simulador do ESP32!
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto scroll-fino">
          {eventos.map((e) => (
            <li
              key={e._id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-800/60 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-slate-200">{e.vaga}</span>
              <span className="rounded bg-slate-700/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                {e.tipo}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  e.ocupada ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {e.ocupada ? "Ocupada" : "Livre"}
              </span>
              <span className="text-xs tabular-nums text-slate-500">
                {formatarTempo(e.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}