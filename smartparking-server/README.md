# SmartParking Server

Servidor Node.js (Express) do projeto SmartParking. Recebe dados de 3 vagas de estacionamento enviados por um ESP32 via HTTP POST, persiste no **PostgreSQL** (historico relacional) e no **MongoDB** (estado atual + eventos brutos) e expoe uma API REST para o dashboard React.

## Estrutura do projeto

```
smartparking-server/
├── package.json          # Configuracao do projeto e dependencias
├── docker-compose.yml    # MongoDB em container Docker
├── .env                  # Variaveis de ambiente (porta e credenciais dos bancos)
├── .gitignore            # Arquivos ignorados pelo Git
├── src/
│   ├── server.js         # Ponto de entrada (Express, middlewares, rotas)
│   ├── routes/
│   │   └── vagas.js      # Rotas de /api/vagas
│   ├── controllers/
│   │   └── vagasController.js  # Logica dos endpoints
│   ├── services/
│   │   └── vagasService.js     # Regras de negocio (orquestra os 2 bancos + fallback)
│   ├── repositories/
│   │   ├── vagasRepository.js      # Consultas SQL do PostgreSQL (parametrizadas)
│   │   └── vagasMongoRepository.js # Operacoes no MongoDB (estado + eventos)
│   ├── database/
│   │   ├── schema.sql          # Criacao do banco e tabelas (PostgreSQL)
│   │   ├── connection.js       # Pool de conexoes com o PostgreSQL
│   │   └── mongoConnection.js  # Conexao com o MongoDB (lazy)
│   └── data/
│       └── vagasMemoria.js     # Fallback em memoria (usado se os bancos cairem)
└── README.md
```

## Requisitos

- Node.js v18 ou superior
- npm (vem junto com o Node.js)
- PostgreSQL 18 (servico rodando na porta 5432)
- Docker (para o MongoDB via container)

## Como rodar

### 0. Subir o MongoDB (Docker) e criar os bancos

```bash
# Sobe o container do MongoDB
docker compose up -d

# Cria o banco/colecoes/indices do MongoDB (somente na primeira vez)
docker exec smartparking-mongodb mongosh --eval "db = db.getSiblingDB('smartparking_nosql'); db.createCollection('estado_vagas'); db.createCollection('eventos_brutos'); db.estado_vagas.createIndex({ codigo: 1 }, { unique: true }); db.eventos_brutos.createIndex({ timestamp: -1 }); db.eventos_brutos.createIndex({ vaga: 1 });"

# Cria o banco/tabelas do PostgreSQL (somente na primeira vez)
psql -U postgres -f src/database/schema.sql
```

> No Windows, o `psql` costuma estar em `C:\Program Files\PostgreSQL\18\bin\psql.exe` (use o caminho completo se nao estiver no PATH).

### 1. Instalar as dependencias

```bash
npm install
```

### 2. Rodar o servidor em modo desenvolvimento (com nodemon)

```bash
npm run dev
```

> O nodemon reinicia o servidor automaticamente a cada alteracao no codigo.

### 3. Rodar em modo producao (sem nodemon)

```bash
npm start
```

O servidor sobe em `http://localhost:3000`.

## Endpoints

### GET /api/vagas

Retorna o status atual das 3 vagas.

```json
{
  "vagas": [
    { "id": "A01", "ocupada": false, "preferencial": false },
    { "id": "A02", "ocupada": false, "preferencial": false },
    { "id": "A03", "ocupada": false, "preferencial": true }
  ],
  "totalLivres": 3,
  "totalOcupadas": 0,
  "lotado": false,
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### POST /api/vagas

Recebe a atualizacao de uma vaga vinda do ESP32.

Corpo da requisicao:

```json
{
  "vaga": "A01",
  "ocupada": true,
  "preferencial": false
}
```

Resposta:

```json
{
  "sucesso": true,
  "mensagem": "Vaga A01 atualizada",
  "vagas": [...],
  "totalLivres": 2,
  "lotado": false
}
```

### GET /api/status

Resumo simples, pensado para o ESP32 consultar:

```json
{
  "totalLivres": 2,
  "totalOcupadas": 1,
  "lotado": false
}
```

### GET /api/historico?limite=20

Historico de ocupacao (mais recente primeiro). Cada mudanca de estado registrada pelo POST gera uma linha aqui.

```json
{
  "sucesso": true,
  "historico": [
    { "id": 1, "codigo": "A01", "ocupada": true, "timestamp": "2025-01-01T12:00:00.000Z" }
  ]
}
```

### GET /api/eventos?limite=20&vaga=A01

Eventos brutos recebidos do ESP32 (MongoDB), mais recentes primeiro. O filtro `vaga` e opcional.

```json
{
  "sucesso": true,
  "eventos": [
    {
      "_id": "6ac28cd489805d46343adf24",
      "timestamp": "2025-01-01T12:00:00.000Z",
      "tipo": "VAGA_ATUALIZADA",
      "vaga": "A01",
      "ocupada": true,
      "preferencial": false,
      "payloadOriginal": null,
      "ipOrigem": null
    }
  ]
}
```

## Responsabilidade de cada banco

| Banco | Responsabilidade | Endpoints |
|---|---|---|
| MongoDB (`smartparking_nosql`) | Estado atual das vagas + eventos brutos (flexivel, alto volume) | GET/POST /api/vagas, GET /api/status, GET /api/eventos |
| PostgreSQL (`smartparking`) | Historico de ocupacao (relacional, FK, integridade) | GET /api/historico |
| Memoria | Fallback quando os dois bancos estao fora do ar | - |

## Fallbacks

- **MongoDB fora do ar**: GET /api/vagas e GET /api/status respondem 503 com dados da memoria; GET /api/historico continua funcionando (PostgreSQL).
- **PostgreSQL fora do ar**: GET /api/historico responde 503; GET /api/vagas continua funcionando (MongoDB).
- **Ambos fora do ar**: 503 com dados do fallback em memoria.
- **POST com falha parcial**: 503 avisando em qual banco foi aplicado.

## Testando com curl

```bash
# Listar vagas
curl http://localhost:3000/api/vagas

# Atualizar uma vaga (simula o ESP32)
curl -X POST http://localhost:3000/api/vagas ^
  -H "Content-Type: application/json" ^
  -d "{\"vaga\":\"A01\",\"ocupada\":true,\"preferencial\":false}"

# Ver resumo do estacionamento
curl http://localhost:3000/api/status

# Ver historico de ocupacao (PostgreSQL)
curl "http://localhost:3000/api/historico?limite=10"

# Ver eventos brutos (MongoDB)
curl "http://localhost:3000/api/eventos?limite=10&vaga=A01"
```

> No Windows, use `curl.exe` para evitar conflito com o alias `curl` do PowerShell.

## Proximas etapas (Parte 4)

- Dashboard React consumindo a API (getions de vagas em tempo real)