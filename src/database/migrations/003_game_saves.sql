-- Migration 003: Sistema de Slots de Save (Múltiplas Carreiras)
-- Criado em: 2026-01-22

-- Tabela para armazenar múltiplos saves (carreiras)
CREATE TABLE IF NOT EXISTS game_saves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_name TEXT NOT NULL,
    season INTEGER NOT NULL DEFAULT 1,
    player_team TEXT,
    snapshot_data TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_saves_updated ON game_saves(updated_at DESC);

-- Registrar versão da migration
INSERT INTO schema_version (version, description) 
VALUES (3, 'Sistema de Slots de Save (Múltiplas Carreiras)')
ON CONFLICT(version) DO NOTHING;
