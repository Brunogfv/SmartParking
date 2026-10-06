// ============================================================
// SpotDetail - painel lateral de detalhes da vaga selecionada
// Usa os dados reais (sensores, metadata) que a API entrega
// ============================================================

function formatarHora(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR");
}

export default function SpotDetail({ vaga, aoFechar, aoVerHistorico }) {
  if (!vaga) return null;

  const ocupada = vaga.ocupada;
  const distancia = vaga.sensores?.distanciaCm;
  const temDistancia = typeof distancia === "number" && distancia > 0;
  const mac = vaga.metadata?.macAddress;

  return (
    <div className="fixed inset-0 z-40">
      {/* Fundo escuro clicavel */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={aoFechar} />

      {/* Painel lateral */}
      <aside className="painel-entrar absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
        {/* Cabecalho */}
        <div className="flex items-start justify-between border-b border-slate-800 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Vaga selecionada
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-3xl font-black">
              {vaga.id}
              {vaga.preferencial && (
                <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-bold text-blue-300">
                  PREFERENCIAL ♿
                </span>
              )}
            </h3>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${
                ocupada ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {ocupada ? "🔴 Ocupada" : "🟢 Livre"}
            </span>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Dados do sensor */}
        <div className="flex-1 space-y-3 overflow-y-auto scroll-fino p-5">
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              📡 Sensor
            </p>
            <p className="mt-1 font-semibold text-slate-200">HC-SR04 (ultrassônico)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Distância
              </p>
              <p className="mt-1 text-2xl font-black text-slate-100">
                {temDistancia ? distancia.toFixed(1) : "—"}
                {temDistancia && <span className="text-sm font-semibold text-slate-400"> cm</span>}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Última leitura
              </p>
              <p className="mt-1 text-2xl font-black text-slate-100">
                {formatarHora(vaga.sensores?.ultimaLeitura || vaga.ultimaAtualizacao)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Última atualização
            </p>
            <p className="mt-1 font-semibold text-slate-200">
              {formatarHora(vaga.ultimaAtualizacao)}
            </p>
          </div>

          {mac && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                ESP32 (maquete)
              </p>
              <p className="mt-1 font-mono text-sm text-slate-200">{mac}</p>
            </div>
          )}

          <button
            onClick={aoVerHistorico}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 py-3 font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:brightness-110"
          >
            📜 Ver histórico desta vaga
          </button>
        </div>
      </aside>
    </div>
  );
}