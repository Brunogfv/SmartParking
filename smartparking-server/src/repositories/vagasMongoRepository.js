// ============================================================
// Repository MongoDB - operacoes nas colecoes estado_vagas
// e eventos_brutos
// ============================================================
const { conectar } = require("../database/mongoConnection");

// Retorna todos os documentos de estado_vagas (estado atual)
async function listarEstadoVagas() {
  const db = await conectar();
  return db
    .collection("estado_vagas")
    .find({})
    .sort({ codigo: 1 })
    .toArray();
}

// Busca o estado de uma vaga pelo codigo (ex: "A01")
async function buscarEstadoVaga(codigo) {
  const db = await conectar();
  return db.collection("estado_vagas").findOne({ codigo });
}

// Atualiza (ou cria, via upsert) o documento de estado da vaga.
// "extras" permite gravar campos novos (sensores, metadata...)
// sem precisar de migracao - a flexibilidade do NoSQL.
async function atualizarEstadoVaga(codigo, ocupada, preferencial, extras = {}) {
  const db = await conectar();
  await db.collection("estado_vagas").updateOne(
    { codigo },
    {
      $set: {
        codigo,
        ocupada,
        preferencial,
        ultimaAtualizacao: new Date(),
        ...extras
      }
    },
    { upsert: true }
  );
  return db.collection("estado_vagas").findOne({ codigo });
}

// Insere um evento bruto em eventos_brutos (auditoria/debug)
async function inserirEventoBruto(evento) {
  const db = await conectar();
  const resultado = await db.collection("eventos_brutos").insertOne({
    timestamp: new Date(),
    ...evento
  });
  return resultado.insertedId;
}

// Lista eventos brutos (filtro opcional por vaga), mais recentes primeiro
async function listarEventosBrutos(limite = 20, vaga) {
  const db = await conectar();
  const filtro = vaga ? { vaga } : {};
  return db
    .collection("eventos_brutos")
    .find(filtro)
    .sort({ timestamp: -1 })
    .limit(limite)
    .toArray();
}

module.exports = {
  listarEstadoVagas,
  buscarEstadoVaga,
  atualizarEstadoVaga,
  inserirEventoBruto,
  listarEventosBrutos
};