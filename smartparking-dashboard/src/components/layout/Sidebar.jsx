// ============================================================
// Sidebar - navegacao do sistema (desktop: lateral / mobile: base)
// ============================================================

const ITENS = [
  { id: "estacionamento", icone: "🅿️", rotulo: "Estacionamento" },
  { id: "smartbot", icone: "🤖", rotulo: "SmartBot" },
  { id: "acesso", icone: "🚧", rotulo: "Controle de Acesso" },
  { id: "historico", icone: "📜", rotulo: "Histórico" }
];

export default function Sidebar({ pagina, aoNavegar }) {
  return (
    <>
      {/* Barra lateral (desktop/tablet) */}
      <nav className="hidden w-20 flex-col items-center gap-2 border-r border-slate-800 bg-slate-900/50 py-6 md:flex lg:w-56 lg:items-stretch lg:px-4">
        {ITENS.map((item) => {
          const ativo = pagina === item.id;
          return (
            <button
              key={item.id}
              onClick={() => aoNavegar(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                ativo
                  ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/10 text-white ring-1 ring-emerald-500/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <span className="text-2xl">{item.icone}</span>
              <span className="hidden text-sm font-semibold lg:block">
                {item.rotulo}
              </span>
            </button>
          );
        })}

        <div className="mt-auto hidden rounded-xl border border-slate-800 bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-500 lg:block">
          🅿️ Estacionamento inteligente com ESP32, PostgreSQL e MongoDB.
          <span className="mt-1 block text-emerald-500">Versão digital da maquete</span>
        </div>
      </nav>

      {/* Navegacao inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden">
        {ITENS.map((item) => {
          const ativo = pagina === item.id;
          return (
            <button
              key={item.id}
              onClick={() => aoNavegar(item.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                ativo ? "text-emerald-300" : "text-slate-500"
              }`}
            >
              <span className="text-xl">{item.icone}</span>
              {item.rotulo.split(" ")[0]}
            </button>
          );
        })}
      </nav>
    </>
  );
}