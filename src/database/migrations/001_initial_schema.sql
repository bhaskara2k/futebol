-- ============================================================================
-- MIGRATION 001: Schema Inicial
-- ============================================================================
-- Data: 2026-01-21
-- Descrição: Schema inicial com base data, deltas e eventos
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;

-- Tabela de versionamento
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL
);

-- Metadados do jogo
CREATE TABLE IF NOT EXISTS game_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Países
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  continent TEXT NOT NULL CHECK(continent IN ('EUR', 'SAM', 'AFR', 'ASI', 'NCA', 'OCE', 'WORLD')),
  flag_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries(continent);

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

CREATE INDEX IF NOT EXISTS idx_teams_country ON teams(country_id);
CREATE INDEX IF NOT EXISTS idx_teams_rival ON teams(rival_id);

-- Jogadores (Base)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nationality_id TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT 0,
  birth_season INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nationality_id) REFERENCES countries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality_id);
CREATE INDEX IF NOT EXISTS idx_players_birth ON players(birth_season);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(is_goalkeeper);

-- Player Seasons (Deltas)
CREATE TABLE IF NOT EXISTS player_seasons (
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  team_id TEXT,
  jersey_number INTEGER,
  overall INTEGER NOT NULL,
  market_value INTEGER NOT NULL,
  contract_years INTEGER NOT NULL DEFAULT 0,
  
  league_matches INTEGER DEFAULT 0,
  league_goals INTEGER DEFAULT 0,
  league_assists INTEGER DEFAULT 0,
  league_motm INTEGER DEFAULT 0,
  
  cup_matches INTEGER DEFAULT 0,
  cup_goals INTEGER DEFAULT 0,
  cup_assists INTEGER DEFAULT 0,
  cup_motm INTEGER DEFAULT 0,
  
  intl_matches INTEGER DEFAULT 0,
  intl_goals INTEGER DEFAULT 0,
  intl_assists INTEGER DEFAULT 0,
  intl_motm INTEGER DEFAULT 0,
  
  national_matches INTEGER DEFAULT 0,
  national_goals INTEGER DEFAULT 0,
  national_assists INTEGER DEFAULT 0,
  national_motm INTEGER DEFAULT 0,
  
  wc_matches INTEGER DEFAULT 0,
  wc_goals INTEGER DEFAULT 0,
  wc_assists INTEGER DEFAULT 0,
  wc_motm INTEGER DEFAULT 0,
  
  wcq_matches INTEGER DEFAULT 0,
  wcq_goals INTEGER DEFAULT 0,
  wcq_assists INTEGER DEFAULT 0,
  wcq_motm INTEGER DEFAULT 0,
  
  youth_matches INTEGER DEFAULT 0,
  youth_goals INTEGER DEFAULT 0,
  youth_assists INTEGER DEFAULT 0,
  youth_motm INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (player_id, season),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_player_seasons_season ON player_seasons(season);
CREATE INDEX IF NOT EXISTS idx_player_seasons_team ON player_seasons(team_id, season);

-- Team Seasons (Deltas)
CREATE TABLE IF NOT EXISTS team_seasons (
  team_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  division_level INTEGER NOT NULL DEFAULT 1,
  budget INTEGER NOT NULL DEFAULT 0,
  overall INTEGER NOT NULL,
  
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

CREATE INDEX IF NOT EXISTS idx_team_seasons_season ON team_seasons(season);
CREATE INDEX IF NOT EXISTS idx_team_seasons_division ON team_seasons(division_level, season);

-- League Seasons
CREATE TABLE IF NOT EXISTS league_seasons (
  country_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'finished', 'waiting_international')),
  
  PRIMARY KEY (country_id, season),
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_league_seasons_season ON league_seasons(season);

-- Division Seasons
CREATE TABLE IF NOT EXISTS division_seasons (
  country_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  division_level INTEGER NOT NULL,
  division_name TEXT NOT NULL,
  
  PRIMARY KEY (country_id, season, division_level),
  FOREIGN KEY (country_id, season) REFERENCES league_seasons(country_id, season) ON DELETE CASCADE
);

-- Títulos
CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  competition_name TEXT NOT NULL,
  competition_type TEXT NOT NULL CHECK(competition_type IN ('national_league', 'national_cup', 'league_cup', 'supercup', 'international', 'world')),
  position INTEGER NOT NULL,
  
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_titles_team ON titles(team_id, season);
CREATE INDEX IF NOT EXISTS idx_titles_season ON titles(season);
CREATE INDEX IF NOT EXISTS idx_titles_type ON titles(competition_type);

-- Prêmios de Jogadores
CREATE TABLE IF NOT EXISTS player_awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  award_type TEXT NOT NULL,
  competition_scope TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  stats TEXT,
  
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_awards_player ON player_awards(player_id, season);
CREATE INDEX IF NOT EXISTS idx_player_awards_season ON player_awards(season);
CREATE INDEX IF NOT EXISTS idx_player_awards_type ON player_awards(award_type);

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

CREATE INDEX IF NOT EXISTS idx_transfers_player ON transfers(player_id, season);
CREATE INDEX IF NOT EXISTS idx_transfers_season ON transfers(season);
CREATE INDEX IF NOT EXISTS idx_transfers_team_from ON transfers(from_team_id, season);
CREATE INDEX IF NOT EXISTS idx_transfers_team_to ON transfers(to_team_id, season);

-- Partidas
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  season INTEGER NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  played BOOLEAN DEFAULT 0,
  competition_name TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  division_id INTEGER,
  country_id TEXT,
  
  FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id, season);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id, season);
CREATE INDEX IF NOT EXISTS idx_matches_competition ON matches(competition_name, season);

-- Eventos de Partida
CREATE TABLE IF NOT EXISTS match_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('goal', 'assist', 'motm')),
  minute INTEGER DEFAULT 0,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);

-- Snapshots
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season INTEGER NOT NULL UNIQUE,
  snapshot_type TEXT NOT NULL DEFAULT 'auto' CHECK(snapshot_type IN ('auto', 'manual')),
  compressed_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_season ON snapshots(season DESC);

-- Registrar migration
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (1, 'Initial schema with base data, deltas and events');
