// ============================================================
// ParkingSpot - vaga de estacionamento visual
// Livre=verde | Ocupada=vermelho | Preferencial=azul (A03)
// Clicavel -> abre o painel de detalhes
// ============================================================
import ParkingCar from "./ParkingCar";

export default function ParkingSpot({ vaga, aoSelecionar }) {
  const ocupada = vaga.ocupada;
  const preferencial = vaga.preferencial;

  // Cor de fundo: ocupada sempre vermelho; preferencial azul; senao verde
  const corFundo = ocupada
    ? "bg-red-600/90"
    : preferencial
      ? "bg-blue-600/90"
      : "bg-emerald-600/90";

  const corBorda = ocupada
    ? "border-red-400"
    : preferencial
      ? "border-blue-400"
      : "border-emerald-400";

  const corLed = ocupada ? "text-red-400" : preferencial ? "text-blue-300" : "text-emerald-300";

  const distancia = vaga.sensores?.distanciaCm;
  const temDistancia = typeof distancia === "number" && distancia > 0;

  return (
    <button
      onClick={() => aoSelecionar(vaga)}
      title={`${vaga.id} - ${ocupada ? "OCUPADA" : "LIVRE"}${preferencial ? " (preferencial)" : ""}`}
      className={`group relative h-40 w-full rounded-xl border-2 ${corBorda} ${corFundo} transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 focus:outline-none focus:ring-2 focus:ring-white/60`}
    >
      {/* Marcacao da vaga (linhas laterais da faixa) */}
      <div className="pointer-events-none absolute inset-x-4 inset-y-3 rounded-md border-x-2 border-dashed border-white/40" />

      {/* Indicador luminoso (LED) pulsando */}
      <span
        className={`led-pulso absolute -right-2 -top-2 h-5 w-5 rounded-full ${corLed} bg-current`}
      />

      {/* Sensor HC-SR04 */}
      <span
        className="absolute left-2 top-2 text-lg opacity-60"
        title={`Sensor HC-SR04${temDistancia ? ` - ${distancia.toFixed(1)} cm` : ""}`}
      >
        📡
      </span>

      {/* Placa do codigo */}
      <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-black/30 px-3 py-0.5 text-lg font-black tracking-widest text-white">
        {vaga.id}
      </span>

      {/* Carro (aparece com animacao quando a vaga fica ocupada) */}
      {ocupada && (
        <span className="carro-entrar absolute inset-0 flex items-center justify-center">
          <ParkingCar className="h-14 w-24 drop-shadow-lg" />
        </span>
      )}

      {/* Estado + simbolo de acessibilidade */}
      <span className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white drop-shadow">
        {ocupada ? "Ocupada" : "Livre"}
        {preferencial && <span title="Vaga preferencial">♿</span>}
      </span>
    </button>
  );
}