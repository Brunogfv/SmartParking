// ============================================================
// ParkingLotMap - representacao digital da maquete
//
//   ENTRADA
//      ↓
//   🚧 CANCELA
//      ↓
//   [A01] [A02] [A03 ♿]
//      ↓
//   🚧 CANCELA
//      ↓
//   SAIDA
// ============================================================
import ParkingSpot from "./ParkingSpot";
import ParkingGate from "./ParkingGate";

export default function ParkingLotMap({ vagas, conectado, aoSelecionar }) {
  const ocupadas = vagas.filter((v) => v.ocupada).length;
  const livres = vagas.length - ocupadas;
  const lotado = livres === 0;

  return (
    <section className="subir-suave rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/40 md:p-6">
      {/* Cabeçalho do mapa */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="text-xl">🗺️</span> Mapa do Estacionamento
        </h2>
        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            lotado
              ? "animate-pulse bg-red-600 text-white"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${lotado ? "bg-white" : "bg-emerald-400 ponto-online"}`} />
          {lotado ? "Lotado" : `${livres} livre${livres === 1 ? "" : "s"} de ${vagas.length}`}
        </span>
      </div>

      {/* Mapa */}
      <div className="flex flex-col items-center gap-2">
        {/* ENTRADA */}
        <div className="flex flex-col items-center">
          <span className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
            Entrada
          </span>
          <span className="text-xl text-slate-500">↓</span>
        </div>

        {/* Cancela de entrada */}
        <ParkingGate aberta={false} rotulo="Cancela entrada" />

        {/* Sensor da entrada */}
        <span
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            conectado ? "bg-sky-500/10 text-sky-300" : "bg-red-500/10 text-red-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${conectado ? "bg-sky-400 ponto-online" : "bg-red-500"}`} />
          📡 Sensor entrada {conectado ? "ONLINE" : "OFFLINE"}
        </span>

        {/* Faixa de estacionamento (asfalto) */}
        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-800/80 p-4 shadow-inner">
          {/* Linha central tracejada */}
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 border-t-2 border-dashed border-slate-600/60" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {vagas.map((vaga) => (
              <div key={vaga.id} className={vaga.id === "A03" ? "sm:col-span-1" : ""}>
                <ParkingSpot vaga={vaga} aoSelecionar={aoSelecionar} />
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Livre</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Ocupada</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Preferencial ♿</span>
          </div>
        </div>

        {/* Sensor da saida */}
        <span
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            conectado ? "bg-sky-500/10 text-sky-300" : "bg-red-500/10 text-red-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${conectado ? "bg-sky-400 ponto-online" : "bg-red-500"}`} />
          📡 Sensor saída {conectado ? "ONLINE" : "OFFLINE"}
        </span>

        {/* Cancela de saida */}
        <ParkingGate aberta={false} rotulo="Cancela saída" />

        {/* SAIDA */}
        <div className="flex flex-col items-center">
          <span className="text-xl text-slate-500">↓</span>
          <span className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
            Saída
          </span>
        </div>
      </div>

      {/* Resumo discreto (sem cards) */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
        <span>
          <b className="text-emerald-400">{livres}</b> livre{livres === 1 ? "" : "s"}
        </span>
        <span className="text-slate-700">•</span>
        <span>
          <b className="text-red-400">{ocupadas}</b> ocupada{ocupadas === 1 ? "" : "s"}
        </span>
        <span className="text-slate-700">•</span>
        <span>
          <b className="text-blue-400">1</b> preferencial ♿
        </span>
      </div>
    </section>
  );
}