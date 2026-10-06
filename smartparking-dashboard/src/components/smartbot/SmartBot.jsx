// ============================================================
// SmartBot - assistente visual do estacionamento
// Mensagens baseadas no estado REAL do sistema (vagas + eventos)
// ============================================================

// Frase principal do bot conforme o estado atual
function mensagemPrincipal(totalLivres, lotado, conectado) {
  if (!conectado) return "Não estou conseguindo falar com o servidor...";
  if (lotado) return "Ops! O estacionamento está lotado.";
  if (totalLivres === 1) return "Temos apenas 1 vaga disponível.";
  if (totalLivres === 2) return "Temos 2 vagas livres no momento.";
  return "Olá! Temos vagas disponíveis.";
}

// Frase secundaria com a ultima novidade real (do historico/eventos)
function mensagemNovidade(historico) {
  if (!historico || historico.length === 0) return "Aguardando eventos...";
  const ultimo = historico[0];
  const hora = new Date(ultimo.timestamp);
  const tempo = isNaN(hora.getTime())
    ? ""
    : ` às ${hora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return `A vaga ${ultimo.codigo} ${ultimo.ocupada ? "acabou de ficar ocupada" : "acabou de ser liberada"}${tempo}.`;
}

export default function SmartBot({ vagas, conectado, historico, grande = false }) {
  const totalLivres = vagas.filter((v) => !v.ocupada).length;
  const lotado = totalLivres === 0;

  const fala = mensagemPrincipal(totalLivres, lotado, conectado);
  const novidade = mensagemNovidade(historico);

  const tamanhoRosto = grande ? "h-24 w-24" : "h-16 w-16";

  return (
    <section
      className={`rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/30 ${
        grande ? "p-6" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar do robo */}
        <div
          className={`relative shrink-0 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-2 ${tamanhoRosto} shadow-inner`}
          aria-label="SmartBot"
        >
          {/* Antena */}
          <span className="absolute -top-3 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-slate-500" />
          <span className="ponto-online absolute -top-5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-400" />

          {/* Tela do rosto */}
          <div className="flex h-full w-full items-center justify-center gap-3 rounded-xl bg-slate-950">
            {/* Olhos (piscam via CSS) */}
            <span className={`bot-olho inline-block h-4 w-4 rounded-full ${lotado ? "bg-red-400" : conectado ? "bg-emerald-400" : "bg-slate-600"}`} />
            <span className={`bot-olho inline-block h-4 w-4 rounded-full ${lotado ? "bg-red-400" : conectado ? "bg-emerald-400" : "bg-slate-600"}`} />
          </div>
          {/* Boca */}
          <span className="absolute bottom-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-slate-600" />
        </div>

        {/* Balao de fala */}
        <div className="relative flex-1">
          <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800/80 px-4 py-3">
            <p className="text-sm font-bold text-slate-100">🤖 SmartBot</p>
            <p className="mt-0.5 text-sm leading-snug text-slate-300">{fala}</p>
            <p className="mt-1.5 border-t border-slate-700/60 pt-1.5 text-xs text-slate-500">
              {novidade}
            </p>
          </div>
          {/* Rabinho do balao */}
          <span className="absolute -left-1.5 top-3 h-3 w-3 rotate-45 rounded-sm border-b border-l border-slate-700 bg-slate-800/80" />
        </div>
      </div>

      {/* Rodape: numeros discretos */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span className="text-emerald-400">{totalLivres} livre{totalLivres === 1 ? "" : "s"}</span>
        <span className="text-slate-700">•</span>
        <span className="text-red-400">{vagas.length - totalLivres} ocupada{totalLivres === vagas.length ? "s" : ""}</span>
        <span className="text-slate-700">•</span>
        <span>{lotado ? "LOTADO" : "OK"}</span>
      </div>
    </section>
  );
}