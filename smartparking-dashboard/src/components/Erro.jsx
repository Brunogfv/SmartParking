// Mensagem de erro amigavel com botao "Tentar novamente"
export default function Erro({ mensagem, aoTentarNovamente }) {
  return (
    <div className="rounded-2xl border border-red-800 bg-red-950/40 p-8 text-center">
      <p className="text-3xl">🚧</p>
      <p className="mt-2 font-semibold text-red-300">
        Não foi possível falar com a API
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {mensagem || "Verifique se o servidor SmartParking está rodando."}
      </p>
      <button
        onClick={aoTentarNovamente}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        Tentar novamente
      </button>
    </div>
  );
}