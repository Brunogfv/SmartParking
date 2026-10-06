// ============================================================
// EventTimeline - linha do tempo do historico real (PostgreSQL)
// ============================================================

function formatarTempo(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("pt-BR");
}

export default function EventTimeline({ dados, carregando, erro, tentarNovamente }) {
  const registros = dados?.historico || [];

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/30 md:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span>📜</span> Linha do tempo
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wider text-slate-400">
          PostgreSQL
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
      ) : registros.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Nenhum evento registrado ainda.
        </p>
      ) : (
        <ol className="relative max-h-[26rem] space-y-1 overflow-y-auto scroll-fino border-l-2 border-slate-800 pl-5">
          {registros.map((r) => {
            const liberada = !r.ocupada;
            const cor = liberada ? "bg-emerald-500" : "bg-red-500";
            const icone = liberada ? "🟢" : "🔴";
            return (
              <li key={r.id} className="relative py-1.5">
                {/* Ponto na linha */}
                <span
                  className={`absolute -left-[27px] top-3 h-3 w-3 rounded-full ${cor} ring-4 ring-slate-900`}
                />
                <p className="text-sm text-slate-200">
                  <span className="mr-1">{icone}</span>
                  <b>{r.codigo}</b> {liberada ? "foi liberada" : "ficou ocupada"}
                </p>
                <p className="pl-5 text-xs tabular-nums text-slate-500">
                  {formatarTempo(r.timestamp)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}