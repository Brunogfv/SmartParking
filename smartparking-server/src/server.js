// ============================================================
// SmartParking Server - ponto de entrada da aplicacao
// ============================================================

// Carrega as variaveis do arquivo .env (PORT, DB_*, etc.)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const vagasRoutes = require("./routes/vagas");
const vagasController = require("./controllers/vagasController");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middlewares globais ----
app.use(cors());          // Libera requisicoes de outros dominios (dashboard React)
app.use(express.json());  // Interpreta o corpo das requisicoes como JSON

// ---- Rotas ----
// Rotas de vagas e historico (GET/POST /api/vagas, GET /api/historico)
app.use("/api/vagas", vagasRoutes);

// GET /api/status - resumo simples para o ESP32 consultar
app.get("/api/status", vagasController.obterStatus);

// GET /api/historico?limite=20 - historico de ocupacao
app.get("/api/historico", vagasController.listarHistorico);

// GET /api/eventos?limite=20&vaga=A01 - eventos brutos recebidos do ESP32
app.get("/api/eventos", vagasController.listarEventosBrutos);

// Rota 404 para qualquer caminho nao mapeado
app.use((req, res) => {
  res.status(404).json({ sucesso: false, mensagem: "Rota nao encontrada" });
});

// ---- Inicializacao do servidor ----
// Sem host especificado, o Express escuta em 0.0.0.0 (todas as
// interfaces) - necessario para o ESP32 acessar pela rede local.
app.listen(PORT, () => {
  console.log(`SmartParking server rodando em http://localhost:${PORT}`);

  // Exibe os IPs da rede local (uteis para configurar o ESP32)
  const rede = require("os").networkInterfaces();
  for (const nome of Object.keys(rede)) {
    for (const iface of rede[nome] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`  LAN: http://${iface.address}:${PORT} (${nome})`);
      }
    }
  }
});