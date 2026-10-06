// ============================================================
// Conexao com o PostgreSQL (Pool de conexoes)
// ============================================================
const { Pool } = require("pg");

// O Pool gerencia varias conexoes simultaneas com o banco,
// reaproveitando-as entre as requisicoes.
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "smartparking"
});

module.exports = pool;