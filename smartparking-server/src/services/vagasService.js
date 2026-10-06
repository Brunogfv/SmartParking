// ============================================================
// Service de vagas - regras de negocio
// Orquestra os DOIS bancos:
//  - MongoDB: estado atual das vagas + eventos brutos (leitura rapida)
//  - PostgreSQL: historico de ocupacao (relacional, com FK)
// Fallbacks: se um banco cair, o outro cobre o que for possivel;
// se ambos cairem, usa a memoria.
// ============================================================
const vagasRepository = require("../repositories/vagasRepository");
const vagasMongoRepository = require("../repositories/vagasMongoRepository");
const memoria = require("../data/vagasMemoria");

// Converte a linha do PostgreSQL para o formato da API (id = codigo)
function formatarVaga(linha) {
  return {
    id: linha.codigo,
    ocupada: linha.ocupada,
    preferencial: linha.preferencial,
    ultimaAtualizacao: linha.atualizado_em || null,
    sensores: null,
    metadata: null
  };
}

// Converte o documento do MongoDB para o formato da API.
// Inclui os dados reais de sensores/metadata que o ESP32 envia.
function formatarVagaMongo(doc) {
  return {
    id: doc.codigo,
    ocupada: doc.ocupada,
    preferencial: doc.preferencial,
    ultimaAtualizacao: doc.ultimaAtualizacao || null,
    sensores: doc.sensores || null,
    metadata: doc.metadata || null
  };
}

// Calcula o resumo (livres, ocupadas, lotado) a partir de uma lista de vagas
function calcularResumo(vagas) {
  const totalOcupadas = vagas.filter((v) => v.ocupada).length;
  const totalLivres = vagas.length - totalOcupadas;
  return {
    totalLivres,
    totalOcupadas,
    lotado: totalLivres === 0
  };
}

// GET /api/vagas - estado atual. Le do MongoDB (rapido);
// se o MongoDB cair, usa o fallback em memoria.
async function obterStatusVagas() {
  try {
    const docs = await vagasMongoRepository.listarEstadoVagas();
    const vagas = docs.map(formatarVagaMongo);
    return { mongoOk: true, dados: { ...calcularResumo(vagas), vagas } };
  } catch (erro) {
    console.error("[AVISO] MongoDB indisponivel ao listar vagas:", erro.message);
    const vagas = memoria.getVagas();
    return { mongoOk: false, dados: { ...calcularResumo(vagas), vagas } };
  }
}

// POST /api/vagas - escreve nos DOIS bancos:
//   PostgreSQL: atualiza a vaga + insere no historico_ocupacao
//   MongoDB:    upsert em estado_vagas + insere em eventos_brutos
async function atualizarVaga(codigo, ocupada, preferencial, extras = {}) {
  const falhas = { pg: null, mongo: null };
  let encontrada = false;

  // --- 1. Verifica se a vaga existe (PostgreSQL e o cadastro oficial) ---
  try {
    const vagaNoBanco = await vagasRepository.buscarVagaPorCodigo(codigo);
    if (vagaNoBanco) {
      encontrada = true;
      const atualizada = await vagasRepository.atualizarVaga(codigo, ocupada, preferencial);
      await vagasRepository.inserirHistorico(atualizada.id, ocupada);
    }
  } catch (erro) {
    falhas.pg = erro;
    console.error("[AVISO] PostgreSQL indisponivel ao atualizar vaga:", erro.message);
  }

  // --- 2. Escreve no MongoDB (estado atual + evento bruto) ---
  try {
    // So sensores/metadata entram no documento de estado da vaga
    const mongoExtras = {};
    if (extras.sensores) mongoExtras.sensores = extras.sensores;
    if (extras.metadata) mongoExtras.metadata = extras.metadata;

    await vagasMongoRepository.atualizarEstadoVaga(codigo, ocupada, preferencial, mongoExtras);
    await vagasMongoRepository.inserirEventoBruto({
      tipo: "VAGA_ATUALIZADA",
      vaga: codigo,
      ocupada,
      preferencial,
      payloadOriginal: extras.payloadOriginal || null,
      ipOrigem: extras.ipOrigem || null
    });
  } catch (erro) {
    falhas.mongo = erro;
    console.error("[AVISO] MongoDB indisponivel ao atualizar vaga:", erro.message);
  }

  // --- 3. Se a vaga nao existe no PG (e o PG esta no ar), e 404 ---
  if (!encontrada && !falhas.pg) {
    return { encontrada: false };
  }

  // --- 4. Fallback em memoria (se algum banco falhou, mantem a memoria atualizada) ---
  if (falhas.pg || falhas.mongo) {
    const vagaMemoria = memoria.atualizarVaga(codigo, ocupada, preferencial);
    if (!vagaMemoria) {
      return { encontrada: false };
    }
  }

  // --- 5. Monta o estado atual para a resposta (Mongo -> memoria) ---
  const estado = await obterStatusVagas();

  return {
    encontrada: true,
    falhas,
    vagas: estado.dados.vagas,
    totalLivres: estado.dados.totalLivres,
    lotado: estado.dados.lotado
  };
}

// GET /api/status - resumo simples para o ESP32 (mesma fonte do GET /api/vagas)
async function obterStatus() {
  const resultado = await obterStatusVagas();
  const { totalLivres, totalOcupadas, lotado } = resultado.dados;
  return { mongoOk: resultado.mongoOk, dados: { totalLivres, totalOcupadas, lotado } };
}

// GET /api/historico - le do PostgreSQL (historico relacional com FK)
async function obterHistorico(limite = 20) {
  try {
    const registros = await vagasRepository.listarHistorico(limite);
    return { pgOk: true, dados: registros };
  } catch (erro) {
    console.error("[AVISO] PostgreSQL indisponivel ao listar historico:", erro.message);
    return { pgOk: false, dados: [] };
  }
}

// GET /api/eventos - le do MongoDB (eventos brutos recebidos do ESP32)
async function obterEventosBrutos(limite = 20, vaga) {
  try {
    const eventos = await vagasMongoRepository.listarEventosBrutos(limite, vaga);
    return { mongoOk: true, dados: eventos };
  } catch (erro) {
    console.error("[AVISO] MongoDB indisponivel ao listar eventos:", erro.message);
    return { mongoOk: false, dados: [] };
  }
}

module.exports = {
  obterStatusVagas,
  atualizarVaga,
  obterStatus,
  obterHistorico,
  obterEventosBrutos
};