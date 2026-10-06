// ============================================================
// Configuracao central do axios + funcoes de cada endpoint
// ============================================================
import axios from "axios";

// URL base da API (definida no .env do dashboard)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 5000
});

// Interceptor especial: quando a API responde 503, ela ainda
// devolve dados do fallback em memoria. Em vez de tratar como
// erro, reaproveitamos esses dados (o dashboard continua vivo).
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response && erro.response.status === 503 && erro.response.data) {
      return { data: { ...erro.response.data, modoFallback: true } };
    }
    return Promise.reject(erro);
  }
);

// GET /api/vagas - estado atual das vagas (MongoDB)
export const buscarVagas = () => api.get("/api/vagas").then((r) => r.data);

// GET /api/status - resumo do estacionamento
export const buscarStatus = () => api.get("/api/status").then((r) => r.data);

// GET /api/historico?limite=N - historico de ocupacao (PostgreSQL)
export const buscarHistorico = (limite = 10) =>
  api.get(`/api/historico?limite=${limite}`).then((r) => r.data);

// GET /api/eventos?limite=N - eventos brutos (MongoDB)
export const buscarEventos = (limite = 10) =>
  api.get(`/api/eventos?limite=${limite}`).then((r) => r.data);

export default api;