// ============================================================
// App - shell do SmartParking
// Navegacao: Estacionamento (padrao) | SmartBot | Acesso | Historico
// ============================================================
import { useState } from "react";
import { usePolling } from "./hooks/usePolling";
import { buscarVagas } from "./services/api";
import Sidebar from "./components/layout/Sidebar";
import StatusBar from "./components/layout/StatusBar";
import ParkingPage from "./pages/ParkingPage";
import SmartBotPage from "./pages/SmartBotPage";
import AccessPage from "./pages/AccessPage";
import HistoryPage from "./pages/HistoryPage";

const PAGINAS = {
  estacionamento: ParkingPage,
  smartbot: SmartBotPage,
  acesso: AccessPage,
  historico: HistoryPage
};

export default function App() {
  const [pagina, setPagina] = useState("estacionamento");

  // Polling do estado das vagas (compartilhado: barra de status + paginas)
  const vagas = usePolling(buscarVagas, 3000, 5000);

  const conectado = !vagas.erro;
  const lotado = vagas.dados?.lotado || false;
  const PaginaAtual = PAGINAS[pagina];

  return (
    <div className="flex min-h-screen bg-slate-950 pb-16 text-slate-100 md:pb-0">
      {/* Navegacao */}
      <Sidebar pagina={pagina} aoNavegar={setPagina} />

      {/* Conteudo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <StatusBar conectado={conectado} lotado={lotado} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:px-6">
          {/* key = pagina: re-anima a transicao entre telas */}
          <div key={pagina} className="subir-suave">
            <PaginaAtual
              vagasPolling={vagas}
              conectado={conectado}
              aoNavegar={setPagina}
            />
          </div>
        </main>

        <footer className="border-t border-slate-800/60 px-6 py-3 text-center text-[11px] text-slate-600">
          SmartParking &middot; ESP32 &middot; Node.js &middot; PostgreSQL +
          MongoDB &middot; Interface digital da maquete
        </footer>
      </div>
    </div>
  );
}