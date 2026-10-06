# SmartParking - Dashboard (Frontend)

Interface web do SmartParking: representacao visual (digital) da maquete fisica, com mapa do estacionamento, SmartBot, controle de acesso e historico.

## Tecnologias

- React 19 + Vite
- Tailwind CSS 3
- Axios (com polling a cada 3 segundos)

## Requisitos

- Node.js 18+
- Backend do SmartParking rodando (ver `../smartparking-server`)

## Como rodar

```bash
npm install
cp .env.example .env    # ajuste VITE_API_URL se necessario
npm run dev
```

Abre em `http://localhost:5173`.

## Telas

| Tela | Descricao |
|---|---|
| 🅿️ Estacionamento | Mapa visual: entrada, cancelas, vagas A01/A02/A03 (A03 preferencial ♿), LEDs e sensores. Vaga clicavel abre painel de detalhes com dados reais do sensor. |
| 🤖 SmartBot | Assistente visual com mensagens baseadas no estado real do estacionamento. |
| 🚧 Controle de Acesso | Estado das cancelas de entrada/saida e sensores (interface preparada para integracao futura com o firmware). |
| 📜 Historico | Linha do tempo do historico (PostgreSQL) + eventos brutos (MongoDB). |

## Scripts

| Comando | Descricao |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Build de producao |
| `npm run preview` | Pre-visualiza o build |
| `npm run lint` | Lint (oxlint) |
