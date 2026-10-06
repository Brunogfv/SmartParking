// ============================================================
// ParkingCar - carro SVG (vista de cima)
// ============================================================

export default function ParkingCar({ className = "" }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      fill="none"
      aria-label="Carro estacionado"
    >
      {/* Carroceria */}
      <rect x="6" y="8" width="52" height="24" rx="8" fill="#334155" />
      {/* Teto/para-brisa */}
      <rect x="20" y="4" width="24" height="10" rx="4" fill="#1e293b" />
      {/* Farois */}
      <rect x="3" y="12" width="4" height="8" rx="1.5" fill="#fef08a" />
      <rect x="57" y="12" width="4" height="8" rx="1.5" fill="#fef08a" />
      {/* Rodas */}
      <rect x="12" y="26" width="8" height="10" rx="3" fill="#0f172a" />
      <rect x="44" y="26" width="8" height="10" rx="3" fill="#0f172a" />
    </svg>
  );
}