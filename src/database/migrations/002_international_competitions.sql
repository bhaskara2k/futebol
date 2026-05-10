-- ============================================================================
-- MIGRATION 002: Competições Internacionais e Histórico Global
-- ============================================================================
-- Data: 2026-01-21
-- Descrição: Adiciona tabelas para competições internacionais e histórico global
-- ============================================================================

-- Competições Internacionais (Copa do Mundo, Continentais, etc)
CREATE TABLE IF NOT EXISTS international_competitions (
  id TEXT NOT NULL,
  season INTEGER NOT NULL,
  competition_data TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'qualifiers', 'league', 'knockout', 'finished')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id, season)
);

CREATE INDEX IF NOT EXISTS idx_intl_comp_season ON international_competitions(season);
CREATE INDEX IF NOT EXISTS idx_intl_comp_status ON international_competitions(status);

-- Histórico Global (Rankings, Estatísticas Globais, etc)
CREATE TABLE IF NOT EXISTS global_history (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registrar migration
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (2, 'Add international competitions and global history tables');
