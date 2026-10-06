// ============================================================
// SmartParking - Simulador do ESP32
// Envia dados de vagas para a API do servidor, imitando o
// comportamento do hardware real (util para testes e demo).
//
// Uso:
//   node simulador.js [modo]
//
// Modos:
//   aleatorio   (padrao) sorteia vaga e estado a cada intervalo
//   sequencial  ocupa todas uma a uma, depois libera uma a uma
//   manual      aguarda comandos no terminal
//   carga       stress test: N POSTs em sequencia rapida
//   cenario     ocupa tudo (LOTADO), espera, libera uma (LIBERADO)
// ============================================================
require("dotenv").config();

const axios = require("axios");
const chalk = require("chalk");
const readline = require("readline");

// ---------- Configuracoes (do .env com valores padrao) ----------
const API_URL = process.env.API_URL || "http://localhost:3000";
const INTERVALO_MS = Number(process.env.INTERVALO_MS) || 5000;
const MODO_PADRAO = process.env.MODO || "aleatorio";
const TOTAL_CARGA = Number(process.env.TOTAL_CARGA) || 100;
const INTERVALO_CARGA = Number(process.env.INTERVALO_CARGA) || 100;
const ESPERA_LOTADO_MS = Number(process.env.ESPERA_LOTADO_MS) || 5000;
const CICLOS_RESUMO = Number(process.env.CICLOS_RESUMO) || 10;
// MAC do ESP32 que aparece no painel de detalhes do dashboard
// (opcional - defina no .env local; vazio = nao envia)
const MAC_ESP32 = process.env.MAC_ESP32 || "";

// ---------- Dados do estacionamento ----------
const VAGAS = ["A01", "A02", "A03"];
const VAGA_PREFERENCIAL = "A03";

// ---------- Contadores (para o resumo) ----------
let totalEnviados = 0;
let sucessos = 0;
let falhas = 0;
let rodando = true;

// ---------- Utilitarios ----------
function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Distancia simulada como a do sensor HC-SR04 real:
// carro presente -> 3 a 8 cm | vaga vazia -> 18 a 30 cm
function distanciaRealista(ocupada) {
  if (ocupada) return Number((3 + Math.random() * 5).toFixed(1));
  return Number((18 + Math.random() * 12).toFixed(1));
}

// Envia um POST para a API imitando o ESP32
async function enviarPost(vaga, ocupada) {
  totalEnviados++;
  const preferencial = vaga === VAGA_PREFERENCIAL;
  const distanciaCm = distanciaRealista(ocupada);

  try {
    const resposta = await axios.post(`${API_URL}/api/vagas`, {
      vaga,
      ocupada,
      preferencial,
      distanciaCm,        // leitura realista do sensor HC-SR04
      macAddress: MAC_ESP32
    });
    sucessos++;
    const estado = ocupada ? "OCUPADA" : "LIVRE";
    console.log(
      chalk.green(`[OK]      ${vaga} -> ${estado}`) +
      chalk.gray(` (${distanciaCm} cm, HTTP ${resposta.status}, livres: ${resposta.data.totalLivres})`)
    );
    return resposta.data;
  } catch (erro) {
    falhas++;
    const status = erro.response ? `HTTP ${erro.response.status}` : "sem conexao";
    console.log(
      chalk.red(`[FALHA]   ${vaga} -> ${status}: ${erro.message}`)
    );
    return null;
  }
}

// Busca o resumo atual do estacionamento
async function mostrarStatus() {
  try {
    const resposta = await axios.get(`${API_URL}/api/status`);
    const s = resposta.data;
    console.log(
      chalk.cyan(`[STATUS]  Livres: ${s.totalLivres} | Ocupadas: ${s.totalOcupadas} | ${s.lotado ? chalk.red("LOTADO") : chalk.green("normal")}`)
    );
    return s;
  } catch (erro) {
    console.log(chalk.red(`[STATUS]  Falha: ${erro.message}`));
    return null;
  }
}

// Resumo parcial (a cada N envios) e final
function mostrarResumo() {
  console.log(
    chalk.gray("--- ") +
    chalk.yellow(`enviados: ${totalEnviados}`) +
    chalk.gray(" | ") +
    chalk.green(`sucessos: ${sucessos}`) +
    chalk.gray(" | ") +
    chalk.red(`falhas: ${falhas}`) +
    chalk.gray(" ---")
  );
}

// ---------- Modo 1: Aleatorio (padrao) ----------
async function modoAleatorio() {
  console.log(chalk.cyan(`Modo ALEATORIO - enviando a cada ${INTERVALO_MS}ms. Ctrl+C para parar.`));

  while (rodando) {
    const vaga = VAGAS[Math.floor(Math.random() * VAGAS.length)];
    const ocupada = Math.random() < 0.5;

    await enviarPost(vaga, ocupada);

    if (totalEnviados % CICLOS_RESUMO === 0) mostrarResumo();
    await aguardar(INTERVALO_MS);
  }
}

// ---------- Modo 2: Sequencial ----------
// Fase 1: ocupa A01, A02, A03 (-> LOTADO)
// Fase 2: libera A01, A02, A03 (-> LIBERADO)
async function modoSequencial() {
  console.log(chalk.cyan("Modo SEQUENCIAL - ocupando todas e depois liberando todas. Ctrl+C para parar."));

  let fase = "ocupar";
  let indice = 0;

  while (rodando) {
    const vaga = VAGAS[indice];
    const ocupada = fase === "ocupar";

    await enviarPost(vaga, ocupada);

    indice++;
    if (indice >= VAGAS.length) {
      indice = 0;
      fase = fase === "ocupar" ? "liberar" : "ocupar";
      console.log(
        chalk.yellow(`[FASE]    ${fase === "ocupar" ? "OCUPANDO TODAS..." : "LIBERANDO TODAS..."}`)
      );
    }

    await aguardar(INTERVALO_MS);
  }
}

// ---------- Modo 3: Manual ----------
async function modoManual() {
  console.log(chalk.cyan("Modo MANUAL - comandos disponiveis:"));
  console.log(chalk.cyan('  "A01 ocupar" | "A01 liberar" | "status" | "sair"'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Requisicoes ainda em andamento (esperamos por elas ao encerrar)
  const pendentes = [];

  rl.prompt();

  rl.on("line", async (linha) => {
    const partes = linha.trim().split(/\s+/);
    const [vaga, acao] = partes;

    if (acao === "ocupar" || acao === "liberar") {
      if (!VAGAS.includes(vaga)) {
        console.log(chalk.red(`Vaga invalida: "${vaga}". Use A01, A02 ou A03.`));
      } else {
        pendentes.push(enviarPost(vaga, acao === "ocupar"));
      }
    } else if (linha.trim() === "status") {
      pendentes.push(mostrarStatus());
    } else if (linha.trim() === "sair") {
      rodando = false;
      rl.close();
    } else {
      console.log(chalk.yellow(`Comando nao reconhecido: "${linha.trim()}"`));
    }

    if (rodando) rl.prompt();
  });

  rl.on("close", async () => {
    rodando = false;
    console.log(chalk.gray("Encerrando modo manual..."));
    // Aguarda as requisicoes em andamento antes de sair
    await Promise.allSettled(pendentes);
    mostrarResumo();
    process.exit(0);
  });

  // Mantem o processo vivo ate o usuario digitar "sair"
  await new Promise(() => {});
}

// ---------- Modo 4: Carga (stress test) ----------
async function modoCarga() {
  console.log(chalk.cyan(`Modo CARGA - ${TOTAL_CARGA} POSTs com intervalo de ${INTERVALO_CARGA}ms.`));

  for (let i = 0; i < TOTAL_CARGA && rodando; i++) {
    const vaga = VAGAS[i % VAGAS.length];
    const ocupada = i % 2 === 0;

    await enviarPost(vaga, ocupada);
    await aguardar(INTERVALO_CARGA);
  }

  console.log(chalk.cyan("Carga concluida!"));
  mostrarResumo();
  process.exit(0);
}

// ---------- Modo 5: Cenario (LOTADO -> LIBERADO) ----------
async function modoCenario() {
  console.log(chalk.cyan("Modo CENARIO - simulando LOTADO e depois LIBERADO."));

  // 1. Ocupa as 3 vagas, uma a uma
  for (const vaga of VAGAS) {
    await enviarPost(vaga, true);
    await aguardar(INTERVALO_MS);
  }

  // 2. Estacionamento lotado
  console.log(chalk.bgRed.black(`\n  LOTADO! Todas as vagas ocupadas. Esperando ${ESPERA_LOTADO_MS}ms...\n`));
  await aguardar(ESPERA_LOTADO_MS);

  // 3. Libera uma vaga
  await enviarPost("A01", false);
  console.log(chalk.bgGreen.black("\n  LIBERADO! Vaga A01 livre novamente.\n"));

  mostrarResumo();
  process.exit(0);
}

// ---------- Encerramento limpo (Ctrl+C) ----------
process.on("SIGINT", () => {
  rodando = false;
  console.log(chalk.gray("\nCtrl+C recebido - encerrando..."));
  mostrarResumo();
  process.exit(0);
});

// ---------- Selecao do modo ----------
const MODOS = {
  aleatorio: modoAleatorio,
  sequencial: modoSequencial,
  manual: modoManual,
  carga: modoCarga,
  cenario: modoCenario
};

async function main() {
  const modo = process.argv[2] || MODO_PADRAO;
  const funcao = MODOS[modo];

  if (!funcao) {
    console.log(chalk.red(`Modo invalido: "${modo}"`));
    console.log(chalk.yellow(`Modos disponiveis: ${Object.keys(MODOS).join(", ")}`));
    process.exit(1);
  }

  await funcao();
}

main().catch((erro) => {
  console.error(chalk.red(`Erro inesperado: ${erro.message}`));
  process.exit(1);
});