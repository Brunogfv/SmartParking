// ============================================================
// ParkingGate - cancela visual (servo motor)
// FECHADA = braco abaixado | ABERTA = braco levantado
// ============================================================

export default function ParkingGate({ aberta = false, rotulo = "CANCELA", grande = false }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${grande ? "scale-110" : ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        🚧 {rotulo}
      </span>
      <div className="relative flex h-24 w-24 items-end justify-center">
        {/* Poste */}
        <div className="absolute bottom-0 left-1/2 h-full w-2.5 -translate-x-1/2 rounded-t-md bg-slate-500 shadow-lg" />
        {/* Braco da cancela (gira ao abrir/fechar) */}
        <div
          className={`absolute bottom-14 left-1/2 origin-left rounded-full border border-white/20 bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg transition-transform duration-700 ease-in-out ${
            aberta ? "rotate-[-90deg]" : "rotate-0"
          }`}
          style={{ width: "56px", height: `${grande ? "8px" : "6px"}` }}
        >
          <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-red-400" />
        </div>
        {/* Farol da cancela */}
        <span
          className={`absolute bottom-16 right-1 h-3 w-3 rounded-full ${
            aberta ? "bg-emerald-400" : "bg-red-500"
          }`}
        />
      </div>
      <span
        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          aberta ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"
        }`}
      >
        {aberta ? "Aberta" : "Fechada"}
      </span>
    </div>
  );
}