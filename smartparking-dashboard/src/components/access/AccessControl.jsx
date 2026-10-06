// ============================================================
// AccessControl - tela de controle de acesso (entrada/saida)
// Visual preparado: o acionamento das cancelas e feito pela
// maquete via ESP-NOW. Nao inventa API inexistente.
// ============================================================
import ParkingGate from "../parking/ParkingGate";

function PainelCancela({ rotulo, carroAntes, aberta, conectado }) {
  return (
    <div className="subir-suave flex flex-col items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
        {rotulo}
      </h3>

      {/* Fluxo visual: carro -> cancela (ou cancela -> carro) */}
      <div className="flex items-center justify-center gap-4 text-4xl">
        {carroAntes && <span className="text-5xl">🚗</span>}
        <span className="text-slate-600">→</span>
        <ParkingGate aberta={aberta} rotulo="" grande />
        {!carroAntes && <span className="text-slate-600">←</span>}
        {!carroAntes && <span className="text-5xl">🚗</span>}
      </div>

      {/* Estado */}
      <span
        className={`rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-widest ${
          aberta ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300"
        }`}
      >
        {aberta ? "Aberta" : "Fechada"}
      </span>

      {/* Sensor */}
      <span
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
          conectado ? "bg-sky-500/10 text-sky-300" : "bg-red-500/10 text-red-300"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${conectado ? "bg-sky-400 ponto-online" : "bg-red-500"}`} />
        Sensor {conectado ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

export default function AccessControl({ conectado }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PainelCancela rotulo="Entrada" carroAntes aberta={false} conectado={conectado} />
        <PainelCancela rotulo="Saída" carroAntes={false} aberta={false} conectado={conectado} />
      </div>

      {/* Nota de integracao (sem API falsa) */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200/90">
        <p className="font-bold">⚙️ Integração das cancelas</p>
        <p className="mt-1 leading-relaxed text-amber-200/70">
          O acionamento das cancelas é feito pela maquete (ESP32 robô via ESP-NOW),
          com sensores HC-SR04 na entrada e na saída. O controle manual por API será
          adicionado quando o firmware expor esse comando — a interface já está
          preparada para recebê-lo.
        </p>
      </div>
    </div>
  );
}