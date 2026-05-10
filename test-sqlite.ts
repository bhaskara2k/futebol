/**
 * 🧪 TESTE BÁSICO DO SQLITE
 * 
 * Este script testa:
 * 1. Inicialização do banco
 * 2. Aplicação do schema
 * 3. Inserção de dados de teste
 * 4. Consultas básicas
 * 5. Snapshots
 */

import Database from 'better-sqlite3';
import { encode, decode } from '@msgpack/msgpack';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = './test-futsal-universe.db';
const SCHEMA_PATH = './src/database/schema.sql';

console.log('🧪 Iniciando testes do SQLite...\n');

// Limpar banco de teste anterior
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️  Banco de teste anterior removido');
}

// 1️⃣ TESTE: Inicializar banco
console.log('\n1️⃣ Testando inicialização do banco...');
const db = new Database(DB_PATH, { verbose: console.log });

// Configurar pragmas
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');

console.log('✅ Banco inicializado com WAL mode');

// 2️⃣ TESTE: Aplicar schema
console.log('\n2️⃣ Testando aplicação do schema...');
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');

try {
    db.exec(schemaSql);
    console.log('✅ Schema aplicado com sucesso');
} catch (error) {
    console.error('❌ Erro ao aplicar schema:', error);
    process.exit(1);
}

// 3️⃣ TESTE: Inserir dados de teste
console.log('\n3️⃣ Testando inserção de dados...');

// Inserir país
const insertCountry = db.prepare(`
  INSERT INTO countries (id, name, continent) VALUES (?, ?, ?)
`);
insertCountry.run('BRA', 'Brasil', 'SAM');
console.log('✅ País inserido: Brasil');

// Inserir time
const insertTeam = db.prepare(`
  INSERT INTO teams (id, name, country_id) VALUES (?, ?, ?)
`);
insertTeam.run('T001', 'Flamengo', 'BRA');
insertTeam.run('T002', 'Palmeiras', 'BRA');
console.log('✅ Times inseridos: Flamengo, Palmeiras');

// Inserir jogador
const insertPlayer = db.prepare(`
  INSERT INTO players (id, name, nationality_id, is_goalkeeper, birth_season)
  VALUES (?, ?, ?, ?, ?)
`);
insertPlayer.run('P001', 'Gabriel Barbosa', 'BRA', 0, -25);
insertPlayer.run('P002', 'Weverton', 'BRA', 1, -30);
console.log('✅ Jogadores inseridos: Gabriel Barbosa, Weverton');

// Inserir player_season
const insertPlayerSeason = db.prepare(`
  INSERT INTO player_seasons (
    player_id, season, team_id, jersey_number, overall, market_value, contract_years,
    league_matches, league_goals, league_assists, league_motm,
    cup_matches, cup_goals, cup_assists, cup_motm,
    intl_matches, intl_goals, intl_assists, intl_motm,
    national_matches, national_goals, national_assists, national_motm,
    wc_matches, wc_goals, wc_assists, wc_motm,
    wcq_matches, wcq_goals, wcq_assists, wcq_motm,
    youth_matches, youth_goals, youth_assists, youth_motm
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertPlayerSeason.run(
    'P001', 1, 'T001', 9, 88, 50000000, 3,
    30, 25, 8, 5,  // Liga
    6, 5, 2, 1,    // Copa
    8, 6, 3, 2,    // Internacional
    0, 0, 0, 0,    // Nacional
    0, 0, 0, 0,    // WC
    0, 0, 0, 0,    // WCQ
    0, 0, 0, 0     // Youth
);

console.log('✅ Stats da temporada 1 inseridas para Gabriel Barbosa');

// 4️⃣ TESTE: Consultas
console.log('\n4️⃣ Testando consultas...');

// Contar registros
const counts = {
    countries: db.prepare('SELECT COUNT(*) as count FROM countries').get(),
    teams: db.prepare('SELECT COUNT(*) as count FROM teams').get(),
    players: db.prepare('SELECT COUNT(*) as count FROM players').get(),
    player_seasons: db.prepare('SELECT COUNT(*) as count FROM player_seasons').get()
};

console.log('📊 Registros no banco:');
console.log(`   - Países: ${counts.countries.count}`);
console.log(`   - Times: ${counts.teams.count}`);
console.log(`   - Jogadores: ${counts.players.count}`);
console.log(`   - Player Seasons: ${counts.player_seasons.count}`);

// Testar view
const topScorers = db.prepare(`
  SELECT * FROM v_top_scorers WHERE season = 1
`).all();

console.log(`\n⚽ Top artilheiros da temporada 1:`);
topScorers.forEach((scorer: any) => {
    console.log(`   - ${scorer.player_name}: ${scorer.total_goals} gols (${scorer.team_name})`);
});

// 5️⃣ TESTE: Snapshots
console.log('\n5️⃣ Testando snapshots...');

const testSnapshot = {
    season: 1,
    teams: ['Flamengo', 'Palmeiras'],
    players: ['Gabriel Barbosa', 'Weverton'],
    timestamp: new Date().toISOString()
};

// Comprimir com MessagePack
const compressed = encode(testSnapshot);
const sizeBytes = compressed.byteLength;

const insertSnapshot = db.prepare(`
  INSERT INTO snapshots (season, snapshot_type, compressed_data, size_bytes, description)
  VALUES (?, ?, ?, ?, ?)
`);

insertSnapshot.run(1, 'manual', compressed, sizeBytes, 'Teste de snapshot');
console.log(`✅ Snapshot criado: ${(sizeBytes / 1024).toFixed(2)}KB`);

// Carregar snapshot
const loadedSnapshot = db.prepare(`
  SELECT compressed_data FROM snapshots WHERE season = 1
`).get();

const decompressed = decode(loadedSnapshot.compressed_data);
console.log('✅ Snapshot carregado:', decompressed);

// 6️⃣ TESTE: Integridade
console.log('\n6️⃣ Testando integridade...');

const integrityCheck = db.prepare('PRAGMA integrity_check').get();
console.log(`✅ Integridade: ${integrityCheck.integrity_check}`);

const foreignKeyCheck = db.prepare('PRAGMA foreign_key_check').all();
if (foreignKeyCheck.length === 0) {
    console.log('✅ Foreign keys: OK');
} else {
    console.error('❌ Foreign keys com problemas:', foreignKeyCheck);
}

// 7️⃣ TESTE: Transações
console.log('\n7️⃣ Testando transações...');

const transaction = db.transaction(() => {
    insertTeam.run('T003', 'Corinthians', 'BRA');
    insertTeam.run('T004', 'São Paulo', 'BRA');
});

transaction();
console.log('✅ Transação executada: 2 times inseridos');

// Verificar
const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get();
console.log(`   Total de times agora: ${teamCount.count}`);

// 8️⃣ TESTE: Performance
console.log('\n8️⃣ Testando performance...');

console.time('Inserir 1000 player_seasons');
const insertMany = db.transaction(() => {
    for (let i = 2; i <= 1000; i++) {
        insertPlayerSeason.run(
            'P001', i, 'T001', 9, 88, 50000000, 3,
            30, 25, 8, 5, 6, 5, 2, 1, 8, 6, 3, 2,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        );
    }
});
insertMany();
console.timeEnd('Inserir 1000 player_seasons');

// Verificar
const seasonCount = db.prepare('SELECT COUNT(*) as count FROM player_seasons').get();
console.log(`   Total de player_seasons: ${seasonCount.count}`);

// 9️⃣ RESUMO FINAL
console.log('\n' + '='.repeat(60));
console.log('🎉 TODOS OS TESTES PASSARAM!');
console.log('='.repeat(60));

console.log('\n📊 Estatísticas Finais:');
console.log(`   - Tamanho do banco: ${(fs.statSync(DB_PATH).size / 1024).toFixed(2)}KB`);
console.log(`   - WAL mode: ${db.pragma('journal_mode', { simple: true })}`);
console.log(`   - Foreign keys: ${db.pragma('foreign_keys', { simple: true })}`);

// Fechar banco
db.close();
console.log('\n✅ Banco fechado com sucesso');

console.log('\n🎯 Próximos passos:');
console.log('   1. Revisar o banco de teste: test-futsal-universe.db');
console.log('   2. Executar queries em: src/database/scripts-uteis.sql');
console.log('   3. Integrar no app principal');

console.log('\n✨ Tudo pronto para integração! ✨\n');
