// ============================================================
// Conexao com o MongoDB (conexao unica, reutilizada pelo app)
// Conexao e feita de forma "preguicosa" (lazy): so conecta
// no primeiro uso, permitindo o servidor subir sem o MongoDB.
// ============================================================
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "smartparking_nosql";

const client = new MongoClient(uri, {
  // Tempo curto de espera: se o MongoDB cair, o fallback
  // em memoria entra em acao rapidamente.
  serverSelectionTimeoutMS: 3000
});

let db = null;

// Conecta ao MongoDB (idempotente: so conecta uma vez)
async function conectar() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`MongoDB conectado em ${uri} (banco: ${dbName})`);
  }
  return db;
}

// Retorna a referencia do banco (lanca erro se nao estiver conectado)
function obterDb() {
  if (!db) {
    throw new Error("MongoDB nao conectado. Chame conectar() primeiro.");
  }
  return db;
}

module.exports = { conectar, obterDb };