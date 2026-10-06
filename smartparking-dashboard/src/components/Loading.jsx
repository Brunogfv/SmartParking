// Indicador de carregamento (spinner)
export default function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
      <span>Carregando...</span>
    </div>
  );
}