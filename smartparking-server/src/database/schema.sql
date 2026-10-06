-- ============================================================
-- SmartParking - Schema do banco de dados (PostgreSQL)
-- Executar com: psql -U postgres -f src/database/schema.sql
-- ============================================================

-- Cria o banco de dados caso ainda nao exista
SELECT 'CREATE DATABASE smartparking'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'smartparking')\gexec

-- Conecta ao banco recém-criado (as tabelas sao criadas nele)
\connect smartparking

-- Tabela de vagas (estado atual de cada vaga)
CREATE TABLE IF NOT EXISTS vagas (
  id            SERIAL PRIMARY KEY,              -- ID interno (FK do historico)
  codigo        VARCHAR(5) UNIQUE NOT NULL,      -- "A01", "A02", "A03"
  preferencial  BOOLEAN DEFAULT FALSE,           -- true para a vaga A03
  ocupada       BOOLEAN DEFAULT FALSE,           -- estado atual da vaga
  criado_em     TIMESTAMP DEFAULT NOW(),         -- data de criacao
  atualizado_em TIMESTAMP DEFAULT NOW()          -- ultima atualizacao
);

-- Tabela de historico (um registro para cada mudanca de estado)
CREATE TABLE IF NOT EXISTS historico_ocupacao (
  id        SERIAL PRIMARY KEY,                  -- ID interno
  vaga_id   INTEGER REFERENCES vagas(id),        -- FK: uma vaga tem muitos historicos
  ocupada   BOOLEAN NOT NULL,                    -- estado no momento da mudanca
  timestamp TIMESTAMP DEFAULT NOW()              -- momento em que a mudanca ocorreu
);

-- Seed das 3 vagas iniciais (ON CONFLICT evita duplicar ao re-executar)
INSERT INTO vagas (codigo, preferencial) VALUES
  ('A01', false),
  ('A02', false),
  ('A03', true)
ON CONFLICT (codigo) DO NOTHING;