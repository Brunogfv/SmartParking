// ============================================================
// Rotas de /api/vagas e /api/historico
// ============================================================
const express = require("express");
const router = express.Router();
const vagasController = require("../controllers/vagasController");

// GET /api/vagas - listar status de todas as vagas
router.get("/", vagasController.listarVagas);

// POST /api/vagas - receber atualizacao do ESP32
router.post("/", vagasController.atualizarVaga);

module.exports = router;