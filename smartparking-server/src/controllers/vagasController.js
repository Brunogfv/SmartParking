// ============================================================
// Controller das vagas - contem a logica de cada endpoint
// Orquestra o service (MongoDB + PostgreSQL com fallbacks)
// ============================================================
const vagasService = require("../services/vagasService");

// GET /api/vagas - estado atual (le do MongoDB)
async function listarVagas(req, res) {
  try {
    const resultado = await vagasService.obterStatusVagas();
    const resposta = { ...resultado.dados, timestamp: new Date().toISOString() };

    // MongoDB fora do ar: 503 + dados do fallback em memoria
    if (!resultado.mongoOk) {
      return res.status(503).json({
        sucesso: false,
        mensagem: "MongoDB indisponivel - dados do fallback em memoria",
        ...resposta
      });
    }

    res.json(resposta);
  } catch (erro) {
    console.error("[ERRO] listarVagas:", erro.message);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar vagas",
      erro: erro.message
    });
  }
}

// POST /api/vagas - recebe atualizacao do ESP32 e escreve nos DOIS bancos
// Corpo esperado: { "vaga": "A01", "ocupada": true, "preferencial": false }
async function atualizarVagaHandler(req, res) {
  try {
    const { vaga, ocupada, preferencial } = req.body;

    // Validacao basica dos campos obrigatorios (erro 400)
    if (!vaga || typeof ocupada !== "boolean") {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Campos 'vaga' (string) e 'ocupada' (boolean) sao obrigatorios."
      });
    }

    // Campos opcionais do hardware real (ESP32):
    // - distanciaCm: leitura real do sensor HC-SR04
    // - macAddress:  identificacao do ESP32 da maquete
    const { distanciaCm, macAddress } = req.body;

    // Dados extras gravados no MongoDB (sensores/metadata/evento bruto)
    const extras = {
      sensores: {
        ultimaLeitura: new Date()
      },
      metadata: undefined,
      payloadOriginal: req.body,
      ipOrigem: req.ip
    };
    if (typeof distanciaCm === "number") {
      extras.sensores.distanciaCm = distanciaCm;
    }
    if (typeof macAddress === "string" && macAddress.length > 0) {
      extras.metadata = { macAddress };
    }

    const resultado = await vagasService.atualizarVaga(vaga, ocupada, preferencial, extras);

    // Vaga inexistente (erro 404)
    if (!resultado.encontrada) {
      return res.status(404).json({
        sucesso: false,
        mensagem: `Vaga ${vaga} nao encontrada.`
      });
    }

    // Se algum banco falhou, responde 503 avisando onde foi aplicado
    if (resultado.falhas.pg || resultado.falhas.mongo) {
      const bancosOk = [];
      if (!resultado.falhas.pg) bancosOk.push("PostgreSQL");
      if (!resultado.falhas.mongo) bancosOk.push("MongoDB");
      return res.status(503).json({
        sucesso: false,
        mensagem: `Falha parcial de escrita (${resultado.falhas.pg ? "PostgreSQL" : ""}${resultado.falhas.pg && resultado.falhas.mongo ? " e " : ""}${resultado.falhas.mongo ? "MongoDB" : ""} indisponivel) - aplicado em: ${bancosOk.join(", ") || "memoria (fallback)"}`,
        vagas: resultado.vagas,
        totalLivres: resultado.totalLivres,
        lotado: resultado.lotado
      });
    }

    res.json({
      sucesso: true,
      mensagem: `Vaga ${vaga} atualizada`,
      vagas: resultado.vagas,
      totalLivres: resultado.totalLivres,
      lotado: resultado.lotado
    });
  } catch (erro) {
    console.error("[ERRO] atualizarVaga:", erro.message);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao atualizar vaga",
      erro: erro.message
    });
  }
}

// GET /api/status - resumo simples para o ESP32 consultar
async function obterStatus(req, res) {
  try {
    const resultado = await vagasService.obterStatus();

    if (!resultado.mongoOk) {
      return res.status(503).json({
        sucesso: false,
        mensagem: "MongoDB indisponivel - status do fallback em memoria",
        ...resultado.dados
      });
    }

    res.json(resultado.dados);
  } catch (erro) {
    console.error("[ERRO] obterStatus:", erro.message);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao obter status",
      erro: erro.message
    });
  }
}

// GET /api/historico?limite=20 - historico de ocupacao (PostgreSQL)
async function listarHistorico(req, res) {
  try {
    const limite = parseInt(req.query.limite, 10) || 20;
    const resultado = await vagasService.obterHistorico(limite);

    if (!resultado.pgOk) {
      return res.status(503).json({
        sucesso: false,
        mensagem: "PostgreSQL indisponivel - historico indisponivel",
        historico: []
      });
    }

    res.json({ sucesso: true, historico: resultado.dados });
  } catch (erro) {
    console.error("[ERRO] listarHistorico:", erro.message);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar historico",
      erro: erro.message
    });
  }
}

// GET /api/eventos?limite=20&vaga=A01 - eventos brutos (MongoDB)
async function listarEventosBrutos(req, res) {
  try {
    const limite = parseInt(req.query.limite, 10) || 20;
    const vaga = req.query.vaga || null;
    const resultado = await vagasService.obterEventosBrutos(limite, vaga);

    if (!resultado.mongoOk) {
      return res.status(503).json({
        sucesso: false,
        mensagem: "MongoDB indisponivel - eventos indisponiveis",
        eventos: []
      });
    }

    res.json({ sucesso: true, eventos: resultado.dados });
  } catch (erro) {
    console.error("[ERRO] listarEventosBrutos:", erro.message);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar eventos",
      erro: erro.message
    });
  }
}

module.exports = {
  listarVagas,
  atualizarVaga: atualizarVagaHandler,
  obterStatus,
  listarHistorico,
  listarEventosBrutos
};