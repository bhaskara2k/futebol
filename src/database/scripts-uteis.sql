-- ============================================================================
-- SCRIPTS ÚTEIS PARA MANUTENÇÃO DO BANCO SQLITE
-- ============================================================================
-- Execute estes comandos diretamente no SQLite ou via service
-- ============================================================================

-- ============================================================================
-- 1. VALIDAÇÃO E DIAGNÓSTICO
-- ============================================================================

-- Verificar integridade do banco
PRAGMA integrity_check;

-- Verificar foreign keys
PRAGMA foreign_key_check;

-- Ver configurações atuais
PRAGMA journal_mode;
PRAGMA synchronous;
PRAGMA foreign_keys;

-- Estatísticas do banco
SELECT 
  'Países' as tabela, COUNT(*) as registros FROM countries
UNION ALL
SELECT 'Times', COUNT(*) FROM teams
UNION ALL
SELECT 'Jogadores', COUNT(*) FROM players
UNION ALL
SELECT 'Player Seasons', COUNT(*) FROM player_seasons
UNION ALL
SELECT 'Team Seasons', COUNT(*) FROM team_seasons
UNION ALL
SELECT 'Transferências', COUNT(*) FROM transfers
UNION ALL
SELECT 'Partidas', COUNT(*) FROM matches
UNION ALL
SELECT 'Títulos', COUNT(*) FROM titles
UNION ALL
SELECT 'Snapshots', COUNT(*) FROM snapshots;

-- Tamanho do banco
SELECT 
  page_count * page_size / 1024.0 / 1024.0 as size_mb 
FROM pragma_page_count(), pragma_page_size();

-- Temporadas disponíveis
SELECT DISTINCT season 
FROM player_seasons 
ORDER BY season DESC;

-- ============================================================================
-- 2. CONSULTAS DE ESTATÍSTICAS
-- ============================================================================

-- Top 20 artilheiros da história
SELECT 
  p.name,
  SUM(ps.league_goals + ps.cup_goals + ps.intl_goals + ps.national_goals + ps.wc_goals) as total_goals,
  COUNT(DISTINCT ps.season) as seasons_played
FROM player_seasons ps
JOIN players p ON ps.player_id = p.id
GROUP BY p.id
ORDER BY total_goals DESC
LIMIT 20;

-- Top 20 assistentes da história
SELECT 
  p.name,
  SUM(ps.league_assists + ps.cup_assists + ps.intl_assists + ps.national_assists + ps.wc_assists) as total_assists,
  COUNT(DISTINCT ps.season) as seasons_played
FROM player_seasons ps
JOIN players p ON ps.player_id = p.id
GROUP BY p.id
ORDER BY total_assists DESC
LIMIT 20;

-- Times com mais títulos
SELECT 
  t.name,
  COUNT(CASE WHEN ti.competition_type = 'national_league' THEN 1 END) as league_titles,
  COUNT(CASE WHEN ti.competition_type = 'national_cup' THEN 1 END) as cup_titles,
  COUNT(CASE WHEN ti.competition_type = 'international' THEN 1 END) as intl_titles,
  COUNT(CASE WHEN ti.competition_type = 'world' THEN 1 END) as world_titles,
  COUNT(*) as total_titles
FROM teams t
LEFT JOIN titles ti ON t.id = ti.team_id
GROUP BY t.id
ORDER BY total_titles DESC
LIMIT 20;

-- Jogadores com mais prêmios
SELECT 
  p.name,
  COUNT(CASE WHEN pa.award_type = 'best_player' THEN 1 END) as best_player_awards,
  COUNT(CASE WHEN pa.award_type = 'golden_boot' THEN 1 END) as golden_boots,
  COUNT(CASE WHEN pa.award_type = 'golden_glove' THEN 1 END) as golden_gloves,
  COUNT(*) as total_awards
FROM players p
LEFT JOIN player_awards pa ON p.id = pa.player_id
GROUP BY p.id
HAVING total_awards > 0
ORDER BY total_awards DESC
LIMIT 20;

-- Evolução de overall de um jogador
SELECT 
  ps.season,
  ps.overall,
  t.name as team_name,
  ps.league_goals,
  ps.league_assists
FROM player_seasons ps
LEFT JOIN teams t ON ps.team_id = t.id
WHERE ps.player_id = 'PLAYER_ID_AQUI'
ORDER BY ps.season;

-- Histórico de transferências de um jogador
SELECT 
  t.season,
  t.transfer_type,
  t_from.name as from_team,
  t_to.name as to_team,
  t.fee
FROM transfers t
LEFT JOIN teams t_from ON t.from_team_id = t_from.id
LEFT JOIN teams t_to ON t.to_team_id = t_to.id
WHERE t.player_id = 'PLAYER_ID_AQUI'
ORDER BY t.season;

-- ============================================================================
-- 3. ANÁLISE DE PERFORMANCE
-- ============================================================================

-- Índices criados
SELECT name, tbl_name, sql 
FROM sqlite_master 
WHERE type = 'index' AND sql IS NOT NULL
ORDER BY tbl_name;

-- Tabelas maiores
SELECT 
  name,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as num_indexes,
  (SELECT SUM(pgsize) FROM dbstat WHERE name=m.name) / 1024.0 / 1024.0 as size_mb
FROM sqlite_master m
WHERE type = 'table'
ORDER BY size_mb DESC;

-- Queries mais lentas (habilitar query_only primeiro)
-- PRAGMA query_only = ON;
EXPLAIN QUERY PLAN
SELECT * FROM v_top_scorers WHERE season = 50;

-- ============================================================================
-- 4. MANUTENÇÃO
-- ============================================================================

-- Otimizar banco (compactar espaço livre)
VACUUM;

-- Analisar estatísticas (melhorar query planner)
ANALYZE;

-- Reindexar tudo
REINDEX;

-- Limpar snapshots antigos (manter apenas últimos 10)
DELETE FROM snapshots 
WHERE id NOT IN (
  SELECT id FROM snapshots 
  ORDER BY season DESC 
  LIMIT 10
);

-- Limpar partidas muito antigas (manter últimas 100 temporadas)
DELETE FROM matches 
WHERE season < (SELECT MAX(season) - 100 FROM player_seasons);

-- ============================================================================
-- 5. BACKUP E RESTAURAÇÃO
-- ============================================================================

-- Backup (executar no terminal)
-- sqlite3 futsal-universe.db ".backup futsal-universe-backup.db"

-- Restaurar (executar no terminal)
-- sqlite3 futsal-universe.db ".restore futsal-universe-backup.db"

-- Exportar para SQL
-- sqlite3 futsal-universe.db ".dump" > backup.sql

-- Importar de SQL
-- sqlite3 futsal-universe.db < backup.sql

-- ============================================================================
-- 6. CONSULTAS AVANÇADAS
-- ============================================================================

-- Clássicos mais disputados
SELECT 
  t1.name as team1,
  t2.name as team2,
  COUNT(*) as total_matches,
  SUM(CASE 
    WHEN (m.home_team_id = t1.id AND m.home_score > m.away_score) OR
         (m.away_team_id = t1.id AND m.away_score > m.home_score)
    THEN 1 ELSE 0 
  END) as team1_wins,
  SUM(CASE 
    WHEN (m.home_team_id = t2.id AND m.home_score > m.away_score) OR
         (m.away_team_id = t2.id AND m.away_score > m.home_score)
    THEN 1 ELSE 0 
  END) as team2_wins,
  SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as draws
FROM matches m
JOIN teams t1 ON t1.id = 'TEAM1_ID'
JOIN teams t2 ON t2.id = 'TEAM2_ID'
WHERE (m.home_team_id = t1.id AND m.away_team_id = t2.id)
   OR (m.home_team_id = t2.id AND m.away_team_id = t1.id);

-- Maiores goleadas da história
SELECT 
  m.season,
  t_home.name as home_team,
  m.home_score,
  m.away_score,
  t_away.name as away_team,
  m.competition_name,
  ABS(m.home_score - m.away_score) as goal_difference
FROM matches m
JOIN teams t_home ON m.home_team_id = t_home.id
JOIN teams t_away ON m.away_team_id = t_away.id
ORDER BY goal_difference DESC
LIMIT 20;

-- Jogadores que jogaram em mais times
SELECT 
  p.name,
  COUNT(DISTINCT ps.team_id) as num_teams,
  COUNT(DISTINCT ps.season) as seasons_played,
  GROUP_CONCAT(DISTINCT t.name) as teams
FROM player_seasons ps
JOIN players p ON ps.player_id = p.id
LEFT JOIN teams t ON ps.team_id = t.id
WHERE ps.team_id IS NOT NULL
GROUP BY p.id
HAVING num_teams > 5
ORDER BY num_teams DESC;

-- Média de gols por temporada
SELECT 
  season,
  COUNT(*) as total_matches,
  SUM(home_score + away_score) as total_goals,
  ROUND(AVG(home_score + away_score), 2) as avg_goals_per_match
FROM matches
GROUP BY season
ORDER BY season;

-- Times invictos em uma temporada
SELECT 
  ts.season,
  t.name,
  ts.matches_played,
  ts.wins,
  ts.draws,
  ts.losses,
  ts.points
FROM team_seasons ts
JOIN teams t ON ts.team_id = t.id
WHERE ts.losses = 0 AND ts.matches_played > 0
ORDER BY ts.season DESC, ts.points DESC;

-- ============================================================================
-- 7. CRIAÇÃO DE VIEWS CUSTOMIZADAS
-- ============================================================================

-- View: Jogadores em atividade (última temporada)
CREATE VIEW IF NOT EXISTS v_active_players AS
SELECT 
  p.id,
  p.name,
  ps.season as last_season,
  t.name as current_team,
  ps.overall,
  ps.league_goals + ps.cup_goals + ps.intl_goals as season_goals
FROM players p
JOIN player_seasons ps ON p.id = ps.player_id
LEFT JOIN teams t ON ps.team_id = t.id
WHERE ps.season = (SELECT MAX(season) FROM player_seasons)
ORDER BY ps.overall DESC;

-- View: Ranking de times por overall médio
CREATE VIEW IF NOT EXISTS v_team_rankings AS
SELECT 
  t.name,
  ts.season,
  ts.overall,
  ts.division_level,
  ts.points,
  RANK() OVER (PARTITION BY ts.season ORDER BY ts.overall DESC) as ranking
FROM team_seasons ts
JOIN teams t ON ts.team_id = t.id
ORDER BY ts.season DESC, ranking;

-- ============================================================================
-- 8. TRIGGERS CUSTOMIZADOS
-- ============================================================================

-- Trigger: Atualizar contador de títulos ao adicionar título
CREATE TRIGGER IF NOT EXISTS update_title_count
AFTER INSERT ON titles
BEGIN
  -- Lógica customizada aqui
  SELECT 'Título adicionado: ' || NEW.competition_name;
END;

-- Trigger: Validar overall (deve estar entre 40 e 99)
CREATE TRIGGER IF NOT EXISTS validate_overall
BEFORE INSERT ON player_seasons
BEGIN
  SELECT CASE
    WHEN NEW.overall < 40 OR NEW.overall > 99 THEN
      RAISE(ABORT, 'Overall deve estar entre 40 e 99')
  END;
END;

-- ============================================================================
-- FIM DOS SCRIPTS
-- ============================================================================
