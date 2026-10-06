// ============================================================
// AccessPage - controle de acesso (cancelas entrada/saida)
// ============================================================
import AccessControl from "../components/access/AccessControl";

export default function AccessPage({ conectado }) {
  return (
    <div className="space-y-4">
      <section className="subir-suave rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🚧</span> Controle de Acesso
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Cancelas de entrada e saída da maquete, controladas pelo ESP32 do robô
          via ESP-NOW, com sensores HC-SR04 de detecção de veículos.
        </p>
      </section>

      <AccessControl conectado={conectado} />
    </div>
  );
}