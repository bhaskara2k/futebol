import { Injectable, inject } from '@angular/core';
import { UniverseService } from './universe.service';

/**
 * Serviço responsável por serializar e deserializar o estado completo do jogo
 * Simplificado para Node.js only - SQLite é a única fonte de verdade
 * 
 * Este service é usado apenas para:
 * - Exportar estado para snapshots
 * - Importar estado de snapshots
 * 
 * Persistência real é feita pelo SqlitePersistenceService
 */
@Injectable({
    providedIn: 'root'
})
export class GameStateService {
    private universeService = inject(UniverseService);

    /**
     * Exporta o estado atual para um arquivo JSON e inicia o download
     */
    downloadBackupJSON() {
        const data = this.exportGameState();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `futsal_backup_${new Date().getTime()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * Importa um estado a partir de uma string JSON
     */
    importBackupJSON(jsonStr: string) {
        try {
            const data = JSON.parse(jsonStr);
            this.importGameState(data);
        } catch (e) {
            console.error('❌ Erro ao processar arquivo JSON de backup:', e);
            alert('Arquivo JSON inválido ou corrompido.');
        }
    }

    /**
     * Exporta o estado completo do jogo
     * Usado apenas para serialização interna (snapshots)
     */
    exportGameState(): any {
        console.log('📦 Exportando estado do jogo...');

        // 1. Obter todos os times completos
        const allTeams = this.universeService.teams();

        // 2. Desidratar Ligas (Substituir objetos Team por Ids)
        const dehydratedLeagues = this.universeService.leagues().map(league => ({
            ...league,
            divisions: league.divisions.map(div => ({
                ...div,
                teams: div.teams.map(t => t.id), // Salva apenas IDs
                fixtures: div.fixtures.map(round => round.map(match => this.simplifyMatch(match))),
                topScorers: [],
                topAssists: [],
                topMotm: []
            })),
            cup: this.simplifyCup(league.cup),
            leagueCup: league.leagueCup ? this.simplifyCup(league.leagueCup) : undefined,
            supercup: league.supercup ? this.simplifyCup(league.supercup) : undefined,
            history: (league.history || []).slice(-100)
        }));

        // 3. Desidratar Competições Internacionais
        const dehydratedIntl = this.universeService.internationalCompetitions().map(comp => ({
            ...comp,
            teams: comp.teams.map(t => t.id),
            leaguePhase: comp.leaguePhase.map(div => ({
                ...div,
                teams: div.teams.map(t => t.id),
                fixtures: div.fixtures.map(round => round.map(match => this.simplifyMatch(match))),
                topScorers: [],
                topAssists: [],
                topMotm: []
            })),
            playoffPhase: comp.playoffPhase ? this.simplifyCup(comp.playoffPhase) : undefined,
            knockoutPhase: comp.knockoutPhase ? this.simplifyCup(comp.knockoutPhase) : undefined,
            topScorers: [],
            topAssists: [],
            topMotm: [],
            history: (comp.history || []).slice(-100)
        }));

        const currentSeason = this.universeService.season();
        const leagues = this.universeService.leagues();
        const currentRound = leagues.length > 0 ? (leagues[0].currentRound + 1) : 0;

        return {
            version: '6.0', // Node.js only version
            timestamp: new Date().toISOString(),
            currentSeason: currentSeason,
            currentRound: currentRound,
            season: currentSeason, // duplicata para segurança
            round: currentRound, // duplicata para segurança

            // Dados completos
            teamsData: allTeams,
            leaguesData: dehydratedLeagues,
            intlData: dehydratedIntl,
            historyMatchesData: this.universeService.matchHistory(),
            historyTransfersData: this.universeService.transferHistory(),

            // Dados globais
            universe: {
                season: this.universeService.season(),
                bestPlayerInTheWorldHistory: this.universeService.bestPlayerInTheWorldHistory().slice(-100),
                gamePhase: this.universeService.gamePhase(),
                bestPlayerOfTheSeasonPodium: this.universeService.bestPlayerOfTheSeasonPodium(),
                goldenGloveOfTheSeason: this.universeService.goldenGloveOfTheSeason(),
                revelationOfTheSeason: this.universeService.revelationOfTheSeason(),
                teamOfTheSeason: this.universeService.teamOfTheSeason(),
                youthChampionsLeagueHistory: this.universeService.youthChampionsLeagueHistory(),
            }
        };
    }

    private simplifyMatch(match: any): any {
        return {
            ...match,
            homeTeam: match.homeTeam.id, // ID
            awayTeam: match.awayTeam.id, // ID
            events: {
                goals: (match.events?.goals || []).map((g: any) => ({
                    player: { id: g.player.id, name: g.player.name, teamId: g.player.teamId },
                    minute: g.minute
                })),
                assists: (match.events?.assists || []).map((a: any) => ({
                    player: { id: a.player.id, name: a.player.name, teamId: a.player.teamId },
                    minute: a.minute
                })),
                motm: match.events?.motm ? { id: match.events.motm.id, name: match.events.motm.name, teamId: match.events.motm.teamId } : null
            }
        };
    }

    private simplifyCup(cup: any): any {
        if (!cup) return undefined;
        return {
            ...cup,
            champion: cup.champion?.id,
            runnerUp: cup.runnerUp?.id,
            rounds: cup.rounds.map((round: any) => ({
                ...round,
                matches: round.matches.map((m: any) => ({
                    ...m,
                    homeTeam: m.homeTeam.id,
                    awayTeam: m.awayTeam.id,
                    winner: m.winner?.id,
                    aggregateWinnerId: m.aggregateWinnerId // já é ID
                }))
            })),
            topScorers: [],
            topAssists: [],
            topMotm: []
        };
    }

    // Helper para converter objeto { item_0: ..., item_1: ... } de volta para array
    private restoreNestedArray(obj: any): any[] {
        if (Array.isArray(obj)) return obj;
        if (!obj || typeof obj !== 'object') return [];

        // Verifica se é o formato convertido (item_0, item_1...)
        const keys = Object.keys(obj).filter(k => k.startsWith('item_'));
        if (keys.length === 0) return [];

        // Ordena chaves e reconstrói array
        keys.sort((a, b) => {
            const numA = parseInt(a.replace('item_', ''));
            const numB = parseInt(b.replace('item_', ''));
            return numA - numB;
        });

        return keys.map(key => obj[key]);
    }

    /**
     * Importa o estado completo do jogo
     */
    importGameState(gameState: any): void {
        if (!gameState) {
            console.error('❌ Falha ao importar: gameState nulo ou indefinido');
            return;
        }
        try {
            console.log('🔄 Importando Game State (Versão:', gameState.version || '1.0', ')');

            // 0. Restaurar Metadados de Progresso do Root (Prioridade)
            if (gameState.currentSeason !== undefined) {
                this.universeService.season.set(gameState.currentSeason);
            }

            // 1. Restaurar Times
            let teamsMap = new Map<string, any>();

            // Suporte para V2/V3/V6 (teamsData separado)
            if (gameState.teamsData && Array.isArray(gameState.teamsData)) {
                console.log(`📥 Processando ${gameState.teamsData.length} times do save...`);
                // Sanitiza os times antes de salvar no signal
                const sanitizedTeams = gameState.teamsData.map((t: any) => {
                    const stats = t.stats || {};
                    return {
                        ...t,
                        overall: t.overall || 60,
                        stats: {
                            points: Number.isFinite(stats.points) ? stats.points : 0,
                            matchesPlayed: Number.isFinite(stats.matchesPlayed) ? stats.matchesPlayed : 0,
                            wins: Number.isFinite(stats.wins) ? stats.wins : 0,
                            draws: Number.isFinite(stats.draws) ? stats.draws : 0,
                            losses: Number.isFinite(stats.losses) ? stats.losses : 0,
                            goalsFor: Number.isFinite(stats.goalsFor) ? stats.goalsFor : 0,
                            goalsAgainst: Number.isFinite(stats.goalsAgainst) ? stats.goalsAgainst : 0
                        }
                    };
                });
                this.universeService.teams.set(sanitizedTeams);
                sanitizedTeams.forEach((t: any) => teamsMap.set(t.id, t));
            }
            // Suporte legado V1
            else if (gameState.universe?.teams) {
                console.log(`📥 Processando ${gameState.universe.teams.length} times do save (formato legado)...`);
                const sanitizedTeams = gameState.universe.teams.map((t: any) => {
                    const stats = t.stats || {};
                    return {
                        ...t,
                        overall: t.overall || 60,
                        stats: {
                            points: Number.isFinite(stats.points) ? stats.points : 0,
                            matchesPlayed: Number.isFinite(stats.matchesPlayed) ? stats.matchesPlayed : 0,
                            wins: Number.isFinite(stats.wins) ? stats.wins : 0,
                            draws: Number.isFinite(stats.draws) ? stats.draws : 0,
                            losses: Number.isFinite(stats.losses) ? stats.losses : 0,
                            goalsFor: Number.isFinite(stats.goalsFor) ? stats.goalsFor : 0,
                            goalsAgainst: Number.isFinite(stats.goalsAgainst) ? stats.goalsAgainst : 0
                        }
                    };
                });
                this.universeService.teams.set(sanitizedTeams);
                sanitizedTeams.forEach((t: any) => teamsMap.set(t.id, t));
            } else {
                console.warn('⚠️ NENHUM TIME ENCONTRADO NO SAVE!');
            }

            console.log(`✅ Mapa de times construído com ${teamsMap.size} times.`);

            const getTeam = (id: string) => {
                const team = teamsMap.get(id);
                return team;
            };
            const getPlayer = (teamId: string, playerId: string) => getTeam(teamId)?.players?.find((p: any) => p.id === playerId);

            // 2. Restaurar Ligas e Competições
            let leaguesToRestore = [];
            let intlToRestore = [];

            // Suporte flexível para múltiplos formatos de save (V3, V6, Snapshots)
            if (gameState.leaguesData) {
                leaguesToRestore = gameState.leaguesData;
                console.log(`📥 Encontradas ${leaguesToRestore.length} ligas (Formato Data).`);
            } else if (gameState.leagues) {
                leaguesToRestore = gameState.leagues;
                console.log(`📥 Encontradas ${leaguesToRestore.length} ligas (Formato Direto).`);
            }
            else if (gameState.universe?.leagues) {
                leaguesToRestore = gameState.universe.leagues;
                console.log(`📥 Encontradas ${leaguesToRestore.length} ligas (Formato Legado).`);
            } else {
                console.error('❌ NENHUMA LIGA ENCONTRADA NO SAVE! Chaves disponíveis:', Object.keys(gameState));
            }

            if (gameState.intlData) intlToRestore = gameState.intlData;
            else if (gameState.internationalCompetitions) intlToRestore = gameState.internationalCompetitions;
            else if (gameState.universe?.internationalCompetitions) intlToRestore = gameState.universe.internationalCompetitions;

            // Reidratar Ligas (conectar referências)
            console.log('🔄 Iniciando reidratação das ligas...');
            try {
                const rehydratedLeagues = leaguesToRestore.map((league: any, leagueIndex: number) => {
                    console.log(`   📋 Processando liga ${leagueIndex + 1}/${leaguesToRestore.length}: ${league.countryName || league.countryId}`);

                    // Garante que o progresso da rodada seja respeitado
                    const leagueRound = league.currentRound !== undefined ? league.currentRound : (gameState.currentRound > 0 ? gameState.currentRound - 1 : 0);

                    return {
                        ...league,
                        currentRound: leagueRound,
                        divisions: league.divisions.map((div: any, divIndex: number) => {
                            const fixturesArray = this.restoreNestedArray(div.fixtures);

                            const teamIds = div.teams || [];
                            const foundTeams = teamIds.map((id: string) => getTeam(id)).filter((t: any) => !!t);
                            const missingCount = teamIds.length - foundTeams.length;

                            if (missingCount > 0) {
                                console.warn(`   ⚠️ ${missingCount} time(s) não encontrado(s) na divisão ${divIndex + 1} de ${league.countryName}`);
                            }

                            return {
                                ...div,
                                teams: foundTeams,
                                fixtures: fixturesArray.map((round: any) => {
                                    const matchesArray = this.restoreNestedArray(round);
                                    return matchesArray.map((m: any) => this.restoreMatch(m, getTeam, getPlayer));
                                }),
                                topScorers: [],
                                topAssists: [],
                                topMotm: []
                            };
                        }),
                        cup: this.restoreCup(league.cup, getTeam),
                        leagueCup: this.restoreCup(league.leagueCup, getTeam),
                        supercup: this.restoreCup(league.supercup, getTeam)
                    };
                });

                console.log(`✅ ${rehydratedLeagues.length} ligas reidratadas com sucesso.`);
                // Garantir que não existam ligas duplicadas na reidratação
                const uniqueLeagues: any[] = [];
                const seenCountries = new Set<string>();
                for (const league of rehydratedLeagues) {
                    if (!seenCountries.has(league.countryId)) {
                        seenCountries.add(league.countryId);
                        uniqueLeagues.push(league);
                    }
                }
                this.universeService.leagues.set(uniqueLeagues);
            } catch (err) {
                console.error('❌ ERRO CRÍTICO NA REIDRATAÇÃO DE LIGAS:', err);
                throw err;
            }

            // Reidratar Internacionais
            const rehydratedIntl = intlToRestore.map((comp: any) => ({
                ...comp,
                teams: comp.teams.map((id: string) => getTeam(id)).filter((t: any) => !!t),
                leaguePhase: comp.leaguePhase.map((div: any) => {
                    const fixturesArray = this.restoreNestedArray(div.fixtures);
                    return {
                        ...div,
                        teams: div.teams.map((id: string) => getTeam(id)).filter((t: any) => !!t),
                        fixtures: fixturesArray.map((round: any) => {
                            const matchesArray = this.restoreNestedArray(round);
                            return matchesArray.map((m: any) => this.restoreMatch(m, getTeam, getPlayer));
                        })
                    };
                }),
                playoffPhase: this.restoreCup(comp.playoffPhase, getTeam),
                knockoutPhase: this.restoreCup(comp.knockoutPhase, getTeam)
            }));
            // Filtrar as competições removidas para não carregar de saves antigos
            const filteredRehydratedIntl = rehydratedIntl.filter((comp: any) => comp.id !== 'NCA_GC' && comp.id !== 'ASI_NC');
            this.universeService.internationalCompetitions.set(filteredRehydratedIntl);


            // 3. Restaurar Dados Globais do Universe
            if (gameState.universe) {
                const u = gameState.universe;
                if (u.season !== undefined) this.universeService.season.set(u.season);
                if (u.bestPlayerInTheWorldHistory) this.universeService.bestPlayerInTheWorldHistory.set(u.bestPlayerInTheWorldHistory);

                if (u.youthChampionsLeagueHistory) this.universeService.youthChampionsLeagueHistory.set(u.youthChampionsLeagueHistory);
                if (u.gamePhase) this.universeService.gamePhase.set(u.gamePhase);

                if (u.bestPlayerOfTheSeasonPodium !== undefined) this.universeService.bestPlayerOfTheSeasonPodium.set(u.bestPlayerOfTheSeasonPodium);
                if (u.goldenGloveOfTheSeason !== undefined) this.universeService.goldenGloveOfTheSeason.set(u.goldenGloveOfTheSeason);
                if (u.revelationOfTheSeason !== undefined) this.universeService.revelationOfTheSeason.set(u.revelationOfTheSeason);
                if (u.teamOfTheSeason !== undefined) this.universeService.teamOfTheSeason.set(u.teamOfTheSeason);

                // Restaurar históricos
                if (gameState.historyMatchesData && Array.isArray(gameState.historyMatchesData)) {
                    console.log(`📥 Restaurando ${gameState.historyMatchesData.length} partidas do histórico...`);
                    this.universeService.matchHistory.set(gameState.historyMatchesData);
                }
                else if (u.matchHistory) {
                    console.log(`📥 Restaurando ${u.matchHistory.length} partidas do histórico (Legacy)...`);
                    this.universeService.matchHistory.set(u.matchHistory);
                }

                if (gameState.historyTransfersData && Array.isArray(gameState.historyTransfersData)) {
                    console.log(`📥 Restaurando ${gameState.historyTransfersData.length} transferências do histórico...`);
                    this.universeService.transferHistory.set(gameState.historyTransfersData);
                }
                else if (u.transferHistory) {
                    console.log(`📥 Restaurando ${u.transferHistory.length} transferências do histórico (Legacy)...`);
                    this.universeService.transferHistory.set(u.transferHistory);
                }
            }

            console.log('✅ Estado do jogo restaurado e reidratado com sucesso!');

            // 4. RECALCULAR RANKINGS DE JOGADORES (Artilheiros, Assistências, Melhor do Mundo)
            // Isso é necessário porque os arrays foram zerados durante a reidratação
            console.log('🔄 Recalculando rankings de jogadores...');
            const leagues = this.universeService.leagues();
            let totalPlayersProcessed = 0;

            leagues.forEach(league => {
                // Recalcular rankings das divisões
                league.divisions.forEach(division => {
                    const allPlayers: any[] = division.teams.flatMap(t => t.players);
                    division.topScorers = [...allPlayers].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10);
                    division.topAssists = [...allPlayers].sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10);
                    division.topMotm = [...allPlayers].sort((a, b) => (b.stats.motm || 0) - (a.stats.motm || 0)).slice(0, 10);
                    totalPlayersProcessed += allPlayers.length;
                });

                // Recalcular rankings das copas
                const allLeaguePlayers = league.divisions.flatMap(d => d.teams).flatMap(t => t.players);

                if (league.cup) {
                    league.cup.topScorers = [...allLeaguePlayers].sort((a, b) => b.cupStats.goals - a.cupStats.goals).slice(0, 10);
                    league.cup.topAssists = [...allLeaguePlayers].sort((a, b) => b.cupStats.assists - a.cupStats.assists).slice(0, 10);
                    league.cup.topMotm = [...allLeaguePlayers].sort((a, b) => (b.cupStats.motm || 0) - (a.cupStats.motm || 0)).slice(0, 10);
                }

                if (league.leagueCup) {
                    league.leagueCup.topScorers = [...allLeaguePlayers].sort((a, b) => b.cupStats.goals - a.cupStats.goals).slice(0, 10);
                    league.leagueCup.topAssists = [...allLeaguePlayers].sort((a, b) => b.cupStats.assists - a.cupStats.assists).slice(0, 10);
                    league.leagueCup.topMotm = [...allLeaguePlayers].sort((a, b) => (b.cupStats.motm || 0) - (a.cupStats.motm || 0)).slice(0, 10);
                }

                if (league.supercup) {
                    league.supercup.topScorers = [...allLeaguePlayers].sort((a, b) => b.cupStats.goals - a.cupStats.goals).slice(0, 10);
                    league.supercup.topAssists = [...allLeaguePlayers].sort((a, b) => b.cupStats.assists - a.cupStats.assists).slice(0, 10);
                    league.supercup.topMotm = [...allLeaguePlayers].sort((a, b) => (b.cupStats.motm || 0) - (a.cupStats.motm || 0)).slice(0, 10);
                }
            });

            console.log(`✅ Rankings recalculados para ${totalPlayersProcessed} jogadores em ${leagues.length} ligas`);
        } catch (error) {
            console.error('❌ Erro ao importar estado do jogo:', error);
            throw error;
        }
    }

    private restoreMatch(match: any, getTeam: any, getPlayer: any): any {
        const homeTeam = getTeam(match.homeTeam);
        const awayTeam = getTeam(match.awayTeam);

        if (!homeTeam || !awayTeam) {
            return {
                ...match,
                homeTeam: homeTeam || { id: match.homeTeam, teamName: 'Time Desconhecido', players: [], overall: 0 },
                awayTeam: awayTeam || { id: match.awayTeam, teamName: 'Time Desconhecido', players: [], overall: 0 },
                events: match.events || { goals: [], assists: [], motm: null }
            };
        }

        const resolvePlayer = (p: any, defaultTeamId: string) => {
            if (!p) return null;

            // Se já for um objeto com nome válido, usamos ele (preserva o snapshot da época)
            if (typeof p === 'object' && p.name && p.name !== 'Jogador Desconhecido') {
                return p;
            }

            // Se for apenas ID ou objeto incompleto, tenta buscar
            const pId = typeof p === 'object' ? p.id : p;

            // O snapshot salvou o teamId, usamos ele. Se não tiver, usamos o default.
            const tId = (typeof p === 'object' && p.teamId) ? p.teamId : defaultTeamId;

            const found = getPlayer(tId, pId);
            return found || (typeof p === 'object' ? p : { id: pId, name: 'Jogador Desconhecido' });
        };

        return {
            ...match,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            events: {
                goals: (match.events?.goals || []).map((g: any) => ({
                    ...g,
                    player: resolvePlayer(g.player, homeTeam.id)
                })),
                assists: (match.events?.assists || []).map((a: any) => ({
                    ...a,
                    player: resolvePlayer(a.player, homeTeam.id)
                })),
                motm: resolvePlayer(match.events?.motm, homeTeam.id)
            }
        };
    }

    private restoreCup(cup: any, getTeam: any): any {
        if (!cup) return undefined;
        return {
            ...cup,
            champion: cup.champion ? getTeam(cup.champion) : undefined,
            runnerUp: cup.runnerUp ? getTeam(cup.runnerUp) : undefined,
            rounds: cup.rounds.map((round: any) => ({
                ...round,
                matches: round.matches.map((m: any) => {
                    const homeTeam = getTeam(m.homeTeam);
                    const awayTeam = getTeam(m.awayTeam);
                    const winner = m.winner ? getTeam(m.winner) : undefined;

                    if (!homeTeam || !awayTeam) {
                        console.warn(`⚠️ Times não encontrados em cup match: home=${m.homeTeam}, away=${m.awayTeam}`);
                    }

                    return {
                        ...m,
                        homeTeam: homeTeam || { id: m.homeTeam, teamName: 'Time Desconhecido', players: [], overall: 0 },
                        awayTeam: awayTeam || { id: m.awayTeam, teamName: 'Time Desconhecido', players: [], overall: 0 },
                        winner: winner
                    };
                })
            })),
            topScorers: [],
            topAssists: [],
            topMotm: []
        };
    }
}
