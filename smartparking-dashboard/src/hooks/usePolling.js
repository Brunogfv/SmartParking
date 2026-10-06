// ============================================================
// Hook usePolling - busca dados da API em intervalos regulares
//
// Uso:
//   const { dados, carregando, erro, tentarNovamente } =
//     usePolling(buscarVagas, 3000, 5000);
//
// - Executa a funcao imediatamente e depois a cada `intervalo`
// - Se der erro, tenta de novo a cada `intervaloErro` (5s)
// - Cancela o intervalo ao desmontar (evita vazamento)
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";

export function usePolling(funcaoFetch, intervalo = 3000, intervaloErro = 5000) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const temporizador = useRef(null);

  // Funcao estavel (useCallback) para nao recriar o intervalo a cada render
  const executar = useCallback(async () => {
    try {
      const resultado = await funcaoFetch();
      setDados(resultado);
      setErro(null);
    } catch (e) {
      setErro(e.message || "Erro ao conectar com a API");
    } finally {
      setCarregando(false);
    }
  }, [funcaoFetch]);

  useEffect(() => {
    executar();

    // Intervalo maior quando ha erro (reconexao a cada 5s)
    const intervaloAtivo = erro ? intervaloErro : intervalo;
    temporizador.current = setInterval(executar, intervaloAtivo);

    // Limpeza ao desmontar o componente
    return () => clearInterval(temporizador.current);
  }, [executar, intervalo, intervaloErro, erro]);

  return { dados, carregando, erro, tentarNovamente: executar };
}