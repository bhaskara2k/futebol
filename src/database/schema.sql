-- ============================================================================
-- FUTSAL UNIVERSE - SQLite Schema v1.0
-- ============================================================================
-- Arquitetura: BASE DATA (imutável) + DELTAS (temporada) + EVENTOS (histórico)
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- 1. METADATA & VERSIONING
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (1, 'Initial schema with base data, deltas and events');

CREATE TABLE IF NOT EXISTS game_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. BASE DATA (IMUTÁVEL - Dados que não mudam por temporada)
-- ============================================================================

-- Países e Ligas
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  continent TEXT NOT NULL CHECK(continent IN ('EUR', 'SAM', 'AFR', 'ASI', 'NCA', 'OCE', 'WORLD')),
  flag_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_countries_continent ON countries(continent);

-- Times (Base)
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_id TEXT NOT NULL,
  logo_url TEXT,
  rival_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
  FOREIGN KEY (rival_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_teams_country ON teams(country_id);
CREATE INDEX idx_teams_rival ON teams(rival_id);

-- Jogadores (Base - Dados imutáveis)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_id TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT 0,
  birth_season INTEGER NOT NULL, -- Temporada de nascimento
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nationality_id) REFERENCES countries(id) ON DELETE CASCADE
);

CREATE INDEX idx_players_nationality ON players(nationality_id);
CREATE INDEX idx_players_birth ON players(birth_season);
CREATE INDEX idx_players_position ON players(is_goalkeeper);

-- ============================================================================
-- 3. DELTAS POR TEMPORADA (Apenas mudanças)
-- ============================================================================

-- Estado do Jogador por Temporada
CREATE TABLE IF NOT EXISTS player_seasons (
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  team_id TEXT, -- NULL = Free Agent
  jersey_number INTEGER,
  overall INTEGER NOT NULL,
  market_value INTEGER NOT NULL,
  contract_years INTEGER NOT NULL DEFAULT 0,
  
  -- Stats da Liga Nacional
  league_matches INTEGER DEFAULT 0,
  league_goals INTEGER DEFAULT 0,
  league_assists INTEGER DEFAULT 0,
  league_motm INTEGER DEFAULT 0,
  
  -- Stats de Copa Nacional
  cup_matches INTEGER DEFAULT 0,
  cup_goals INTEGER DEFAULT 0,
  cup_assists INTEGER DEFAULT 0,
  cup_motm INTEGER DEFAULT 0,
  
  -- Stats Internacionais (Clubes)
  intl_matches INTEGER DEFAULT 0,
  intl_goals INTEGER DEFAULT 0,
  intl_assists INTEGER DEFAULT 0,
  intl_motm INTEGER DEFAULT 0,
  
  -- Stats de Seleção
  national_matches INTEGER DEFAULT 0,
  national_goals INTEGER DEFAULT 0,
  national_assists INTEGER DEFAULT 0,
  national_motm INTEGER DEFAULT 0,
  
  -- Stats de Copa do Mundo
  wc_matches INTEGER DEFAULT 0,
  wc_goals INTEGER DEFAULT 0,
  wc_assists INTEGER DEFAULT 0,
  wc_motm INTEGER DEFAULT 0,
  
  -- Stats de Eliminatórias
  wcq_matches INTEGER DEFAULT 0,
  wcq_goals INTEGER DEFAULT 0,
  wcq_assists INTEGER DEFAULT 0,
  wcq_motm INTEGER DEFAULT 0,
  
  -- Stats da Academia (Youth)
  youth_matches INTEGER DEFAULT 0,
  youth_goals INTEGER DEFAULT 0,
  youth_assists INTEGER DEFAULT 0,
  youth_motm INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (player_id, season),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_player_seasons_team ON player_seasons(team_id, season);
CREATE INDEX idx_player_seasons_overall ON player_seasons(season, overall DESC);
CREATE INDEX idx_player_seasons_goals ON player_seasons(season, league_goals DESC);

-- Estado do Time por Temporada
CREATE TABLE IF NOT EXISTS team_seasons (
  team_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  division_level INTEGER NOT NULL DEFAULT 1, -- 1=Div1, 2=Div2, etc
  budget INTEGER NOT NULL DEFAULT 0,
  overall INTEGER NOT NULL,
  
  -- Stats da temporada
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (team_id, season),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_seasons_division ON team_seasons(season, division_level);
CREATE INDEX idx_team_seasons_points ON team_seasons(season, points DESC);

-- Liga por Temporada
CREATE TABLE IF NOT EXISTS league_seasons (
  country_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'finished', 'waiting_international')),
  
  PRIMARY KEY (country_id, season),
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

-- Divisões por Ligas (visto que uma liga pode ter múltiplas divisões)
CREATE TABLE IF NOT EXISTS division_seasons (
  country_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  division_id INTEGER NOT NULL, -- 1, 2, 3
  name TEXT NOT NULL,
  PRIMARY KEY (country_id, season, division_id),
  FOREIGN KEY (country_id, season) REFERENCES league_seasons(country_id, season) ON DELETE CASCADE
);

-- ============================================================================
-- 4. TÍTULOS E CONQUISTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  competition_type TEXT NOT NULL CHECK(competition_type IN ('national_league', 'national_cup', 'league_cup', 'supercup', 'international', 'world')),
  competition_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1, -- 1=Campeão, 2=Vice
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_titles_team ON titles(team_id, season);
CREATE INDEX idx_titles_competition ON titles(competition_type, season);
CREATE INDEX idx_titles_season ON titles(season);

-- Prêmios Individuais
CREATE TABLE IF NOT EXISTS player_awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  award_type TEXT NOT NULL CHECK(award_type IN ('best_player', 'golden_boot', 'golden_glove', 'revelation', 'team_of_season')),
  competition_scope TEXT NOT NULL, -- 'national', 'international', 'world'
  position INTEGER DEFAULT 1, -- Para pódio (1, 2, 3)
  stats_json TEXT, -- JSON com stats relevantes
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX idx_awards_player ON player_awards(player_id, season);
CREATE INDEX idx_awards_type ON player_awards(award_type, season);

-- ============================================================================
-- 5. EVENTOS HISTÓRICOS
-- ============================================================================

-- Transferências
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  from_team_id TEXT,
  to_team_id TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  transfer_type TEXT NOT NULL DEFAULT 'normal' CHECK(transfer_type IN ('normal', 'free', 'loan', 'youth_promotion')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (from_team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (to_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_transfers_player ON transfers(player_id, season);
CREATE INDEX idx_transfers_season ON transfers(season);
CREATE INDEX idx_transfers_team_from ON transfers(from_team_id, season);
CREATE INDEX idx_transfers_team_to ON transfers(to_team_id, season);

-- Partidas (Histórico compacto)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  season INTEGER NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  played BOOLEAN DEFAULT 0,
  competition_name TEXT NOT NULL,
  round_number INTEGER,
  division_id INTEGER, -- NULL se for Copa
  country_id TEXT, -- NULL se for Internacional
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_matches_season ON matches(season);
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);
CREATE INDEX idx_matches_competition ON matches(competition_name, season);

-- Eventos de Partida (Gols, Assistências)
CREATE TABLE IF NOT EXISTS match_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('goal', 'assist', 'motm')),
  minute INTEGER DEFAULT 0,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_match_events_player ON match_events(player_id);

-- ============================================================================
-- 6. SNAPSHOTS (Pontos de Restauração)
-- ============================================================================

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season INTEGER NOT NULL UNIQUE,
  snapshot_type TEXT NOT NULL DEFAULT 'auto' CHECK(snapshot_type IN ('auto', 'manual')),
  compressed_data BLOB NOT NULL, -- MessagePack comprimido
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE INDEX idx_snapshots_season ON snapshots(season DESC);

-- ============================================================================
-- 7. COMPETIÇÕES INTERNACIONAIS E HISTÓRICO GLOBAL
-- ============================================================================

-- Competições Internacionais (Copa do Mundo, Continentais, etc)
CREATE TABLE IF NOT EXISTS international_competitions (
  id TEXT NOT NULL,
  season INTEGER NOT NULL,
  competition_data TEXT NOT NULL, -- JSON serializado da competição completa
  status TEXT NOT NULL CHECK(status IN ('pending', 'qualifiers', 'league', 'knockout', 'finished')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id, season)
);

CREATE INDEX idx_intl_comp_season ON international_competitions(season);
CREATE INDEX idx_intl_comp_status ON international_competitions(status);

-- Histórico Global (Rankings, Estatísticas Globais, etc)
CREATE TABLE IF NOT EXISTS global_history (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON serializado do histórico
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. VIEWS ÚTEIS (Performance)
-- ============================================================================

-- Top Artilheiros por Temporada
CREATE VIEW IF NOT EXISTS v_top_scorers AS
SELECT 
  ps.season,
  p.id as player_id,
  p.name as player_name,
  t.name as team_name,
  (ps.league_goals + ps.cup_goals + ps.intl_goals) as total_goals,
  ps.league_goals,
  ps.cup_goals,
  ps.intl_goals
FROM player_seasons ps
JOIN players p ON ps.player_id = p.id
LEFT JOIN teams t ON ps.team_id = t.id
WHERE (ps.league_goals + ps.cup_goals + ps.intl_goals) > 0
ORDER BY ps.season DESC, total_goals DESC;

-- Histórico de Títulos por Time
CREATE VIEW IF NOT EXISTS v_team_titles AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  COUNT(CASE WHEN ti.competition_type = 'national_league' AND ti.position = 1 THEN 1 END) as league_titles,
  COUNT(CASE WHEN ti.competition_type = 'national_cup' AND ti.position = 1 THEN 1 END) as cup_titles,
  COUNT(CASE WHEN ti.competition_type = 'international' AND ti.position = 1 THEN 1 END) as intl_titles,
  COUNT(CASE WHEN ti.competition_type = 'world' AND ti.position = 1 THEN 1 END) as world_titles,
  COUNT(*) as total_titles
FROM teams t
LEFT JOIN titles ti ON t.id = ti.team_id
GROUP BY t.id, t.name;

-- Carreira Completa do Jogador
CREATE VIEW IF NOT EXISTS v_player_career AS
SELECT 
  p.id as player_id,
  p.name as player_name,
  ps.season,
  t.name as team_name,
  ps.overall,
  (ps.league_goals + ps.cup_goals + ps.intl_goals + ps.national_goals + ps.wc_goals) as total_goals,
  (ps.league_matches + ps.cup_matches + ps.intl_matches + ps.national_matches + ps.wc_matches) as total_matches
FROM players p
JOIN player_seasons ps ON p.id = ps.player_id
LEFT JOIN teams t ON ps.team_id = t.id
ORDER BY p.id, ps.season;

-- ============================================================================
-- 9. TRIGGERS (Integridade e Auditoria)
-- ============================================================================

-- Atualizar timestamp ao modificar player_seasons
CREATE TRIGGER IF NOT EXISTS update_player_seasons_timestamp 
AFTER UPDATE ON player_seasons
BEGIN
  UPDATE player_seasons 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE player_id = NEW.player_id AND season = NEW.season;
END;

-- Atualizar timestamp ao modificar team_seasons
CREATE TRIGGER IF NOT EXISTS update_team_seasons_timestamp 
AFTER UPDATE ON team_seasons
BEGIN
  UPDATE team_seasons 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE team_id = NEW.team_id AND season = NEW.season;
END;

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
