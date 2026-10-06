# SmartParking Simulador

Simula o comportamento do **ESP32** enviando dados de vagas para a API do SmartParking (`smartparking-server`). Util para testar o servidor sem hardware, desenvolver o dashboard em paralelo e ter um plano B na apresentacao.

## Requisitos

- Node.js v18 ou superior
- O servidor SmartParking rodando em `http://localhost:3000`

## Instalacao

```bash
npm install
```

## Como usar

```bash
node simulador.js <modo>
```

| Modo | Comando | Descricao |
|---|---|---|
| Aleatorio (padrao) | `node simulador.js aleatorio` | Sorteia vaga e estado a cada intervalo |
| Sequencial | `node simulador.js sequencial` | Ocupa A01, A02, A03 (LOTADO) e depois libera uma a uma (LIBERADO) |
| Manual | `node simulador.js manual` | Aguarda comandos no terminal |
| Carga | `node simulador.js carga` | Envia N POSTs em sequencia rapida (stress test) |
| Cenario | `node simulador.js cenario` | Ocupa tudo, espera, libera uma vaga |

Ou via npm scripts:

```bash
npm run aleatorio
npm run sequencial
npm run manual
npm run carga
npm run cenario
```

## Comandos do modo manual

```
A01 ocupar
A02 liberar
status
sair
```

## Configuracao (.env)

| Variavel | Padrao | Descricao |
|---|---|---|
| `API_URL` | `http://localhost:3000` | URL da API |
| `INTERVALO_MS` | `5000` | Intervalo entre envios (aleatorio/sequencial) |
| `MODO` | `aleatorio` | Modo padrao (se nenhum argumento for passado) |
| `TOTAL_CARGA` | `100` | Quantidade de POSTs no modo carga |
| `INTERVALO_CARGA` | `100` | Intervalo entre POSTs do modo carga (ms) |
| `ESPERA_LOTADO_MS` | `5000` | Tempo com o estacionamento lotado no modo cenario |
| `CICLOS_RESUMO` | `10` | Exibir resumo parcial a cada N envios |

## Verificando os dados

Apos rodar o simulador, confira nos bancos:

```bash
# MongoDB (estado atual + eventos brutos)
docker exec smartparking-mongodb mongosh --eval "db.getSiblingDB('smartparking_nosql').estado_vagas.find().pretty()"
docker exec smartparking-mongodb mongosh --eval "db.getSiblingDB('smartparking_nosql').eventos_brutos.countDocuments()"

# PostgreSQL (historico de ocupacao)
psql -U postgres -d smartparking -c "SELECT * FROM historico_ocupacao ORDER BY id DESC LIMIT 10;"
```

## Testando a queda da API

Pare o servidor (`Ctrl+C` no terminal do `npm run dev`) e observe o simulador exibir `[FALHA] ... sem conexao` para cada envio, sem travar. Ao religar o servidor, o simulador volta a enviar normalmente.