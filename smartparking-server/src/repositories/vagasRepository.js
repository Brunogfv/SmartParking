// ============================================================
// Repository de vagas - camada que executa as consultas SQL
// Regra: SEMPRE usar parametros ($1, $2...) para evitar SQL injection
// ============================================================
const pool = require("../database/connection");

// SELECT de todas as vagas, ordenadas pelo codigo (A01, A02, A03)
async function listarVagas() {
  const resultado = await pool.query(
    "SELECT * FROM vagas ORDER BY codigo"
  );
  return resultado.rows;
}

// Busca uma vaga pelo codigo (ex: "A01"). Retorna null se nao existir.
async function buscarVagaPorCodigo(codigo) {
  const resultado = await pool.query(
    "SELECT * FROM vagas WHERE codigo = $1",
    [codigo]
  );
  return resultado.rows[0] || null;
}

// Atualiza o estado de ocupacao (e preferencial, se informado) de uma vaga.
// RETURNING * devolve a linha ja atualizada.
async function atualizarVaga(codigo, ocupada, preferencial = null) {
  const resultado = await pool.query(
    `UPDATE vagas
       SET ocupada = $1,
           atualizado_em = NOW(),
           preferencial = COALESCE($3, preferencial)
     WHERE codigo = $2
     RETURNING *`,
    [ocupada, codigo, preferencial]
  );
  return resultado.rows[0] || null;
}

// Insere um registro no historico de ocupacao (uma linha por mudanca)
async function inserirHistorico(vagaId, ocupada) {
  const resultado = await pool.query(
    "INSERT INTO historico_ocupacao (vaga_id, ocupada) VALUES ($1, $2) RETURNING *",
    [vagaId, ocupada]
  );
  return resultado.rows[0];
}

// Lista o historico mais recente primeiro (com o codigo da vaga via JOIN)
async function listarHistorico(limite = 20) {
  const resultado = await pool.query(
    `SELECT h.id, v.codigo, h.ocupada, h.timestamp
       FROM historico_ocupacao h
       JOIN vagas v ON v.id = h.vaga_id
      ORDER BY h.timestamp DESC
      LIMIT $1`,
    [limite]
  );
  return resultado.rows;
}

module.exports = {
  listarVagas,
  buscarVagaPorCodigo,
  atualizarVaga,
  inserirHistorico,
  listarHistorico
};