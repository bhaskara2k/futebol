import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniverseService } from '../../services/universe.service';
import { InternationalCompetitionService } from '../../services/international-competition.service';
import { Player, Team } from '../../models';
import { NATIONALITIES } from '../../nationalities.data';

type ReportType = 'players' | 'u20_players' | 'national_players' | 'national_u20_players' | 'teams' | 'league_stats' | 'matches' | 'transfers' | 'champions' | 'slot_distribution';
type ExportFormat = 'csv' | 'json';

interface PlayerReportData {
    numeroCamisa: number;
    nome: string;
    nacionalidade: string;
    time: string;
    liga: string;
    divisao: string;
    continente: string;
    idade: number;
    posicao: string;
    overall: number;
    valorMercado: number;
    contrato: number;
    // Stats da temporada atual
    jogos: number;
    gols: number;
    assistencias: number;
    mvps: number;
    // Stats de Copa
    jogosCopa: number;
    golsCopa: number;
    assistenciasCopa: number;
    mvpsCopa: number;
    // Stats Internacionais
    jogosInternacional: number;
    golsInternacional: number;
    assistenciasInternacional: number;
    mvpsInternacional: number;
    // Totais
    totalJogos: number;
    totalGols: number;
    totalAssistencias: number;
    totalMVPs: number;
    // Prêmios Individuais
    premiosMelhorDoMundo: number;
    premiosArtilheiro: number;
    premiosMaiorAssistente: number;
    premiosMelhorJogador: number;
    premiosRevelacao: number;
    premiosLuvaDeOuro: number;
    premiosSelecaoDaTemporada: number;
    totalPremios: number;
    // Títulos Coletivos
    titulosLigaNacional: number;
    titulosCopaNacional: number;
    titulosInternacionais: number;
    totalTitulos: number;
    // Histórico
    clubesHistorico: string;
    selecao?: string;
    continenteSelecao?: string;
}

interface TeamReportData {
    time: string;
    liga: string;
    overall: number;
    orcamento: number;
    numeroJogadores: number;
    idadeMedia: number;
    overallMedio: number;
    valorTotalElenco: number;
    // Títulos
    titulosLigaNacional: number;
    titulosCopaNacional: number;
    titulosInternacionais: number;
    titulosTotal: number;
    historicoTitulos: string;
}

interface LeagueStatsData {
    liga: string;
    competicao: string; // Liga, Copa Nacional, ou Internacional
    temporada: number;
    tipo: string; // Artilheiro, Assistente, ou MVP
    posicao: number; // 1 a 10
    jogador: string;
    nacionalidade: string;
    time: string;
    valor: number; // gols, assistências ou MVPs
}

interface MatchData {
    liga: string;
    competicao: string;
    temporada: number;
    rodada: number;
    timeCasa: string;
    timeVisitante: string;
    golsCasa: number;
    golsVisitante: number;
    data: string;
}

interface TransferData {
    temporada: number;
    jogador: string;
    nacionalidade: string;
    overall: number;
    timeOrigem: string;
    timeDestino: string;
    valorTransferencia: number;
    tipoTransferencia: string; // Compra, Venda, Livre, Empréstimo
}

interface ChampionsData {
    temporada: number;
    liga: string;
    competicao: string; // Liga Nacional, Copa Nacional, ou Internacional
    campeao: string;
    viceCampeao: string;
}

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './reports.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
    universeService = inject(UniverseService);
    intCompService = inject(InternationalCompetitionService);

    getCountryNames(countryIds: string[]): string[] {
        if (!countryIds) return [];
        return countryIds.map(id => {
            const nat = NATIONALITIES.find(n => n.code3 === id);
            return nat ? nat.name : id;
        });
    }

    back = output<void>();

    reportType = signal<ReportType | null>(null);
    selectedLeague = signal<string>('all');
    selectedTeam = signal<string>('all');
    exportFormat = signal<ExportFormat>('csv');
    statsScope = signal<'current' | 'all'>('all'); // Temporada atual ou acumulado

    // Lista de ligas disponíveis
    availableLeagues = computed(() => {
        return this.universeService.leagues().map(l => ({
            id: l.countryId,
            name: l.countryName
        }));
    });

    // Lista de times (filtrada por liga se selecionada)
    availableTeams = computed(() => {
        const selectedLeague = this.selectedLeague();
        if (selectedLeague === 'all') {
            return this.universeService.teams().map(t => ({
                id: t.id,
                name: t.teamName
            }));
        }

        const league = this.universeService.leagues().find(l => l.countryId === selectedLeague);
        if (!league) return [];

        const teams: Team[] = [];
        league.divisions.forEach(div => {
            teams.push(...div.teams);
        });

        return teams.map(t => ({ id: t.id, name: t.teamName }));
    });

    // Dados dos jogadores processados
    generatePlayersData(useYouthAcademy: boolean): PlayerReportData[] {
        let allPlayers: Player[] = [];

        const leagues = this.universeService.leagues();
        const selectedLeague = this.selectedLeague();
        const selectedTeam = this.selectedTeam();

        // Filtrar por liga
        const leaguesToProcess = selectedLeague === 'all'
            ? leagues
            : leagues.filter(l => l.countryId === selectedLeague);

        // Coletar todos os jogadores
        leaguesToProcess.forEach(league => {
            league.divisions.forEach(div => {
                div.teams.forEach(team => {
                    // Filtrar por time se selecionado
                    if (selectedTeam === 'all' || team.id === selectedTeam) {
                        const sourcePlayers = useYouthAcademy ? (team.youthAcademy || []) : team.players;

                        sourcePlayers.forEach(player => {
                            allPlayers.push({
                                ...player,
                                teamName: team.teamName,
                                teamId: team.id
                            });
                        });
                    }
                });
            });
        });

        // Mapear para formato de relatório usando o helper
        return allPlayers
            .map(p => this.mapPlayerToReport(p, leagues))
            .sort((a, b) => b.overall - a.overall);
    }

    // Método auxiliar para mapear jogador para relatório
    private mapPlayerToReport(p: any, leagues: any[]): PlayerReportData {
        const league = leagues.find((l: any) =>
            l.divisions.some((d: any) => d.teams.some((t: any) => t.id === p.teamId))
        );

        // Buscar divisão do time
        const division = league?.divisions.find((d: any) =>
            d.teams.some((t: any) => t.id === p.teamId)
        );

        // Buscar histórico do jogador para contar prêmios
        const playerHistory = this.universeService.getPlayerHistory(p.id);
        const awards = playerHistory?.individualAwards || [];

        // Contar cada tipo de prêmio
        const artilheiro = awards.filter((a: any) => a.award === 'Artilheiro').length;
        const maiorAssistente = awards.filter((a: any) => a.award === 'Maior Assistente').length;
        const melhorJogador = awards.filter((a: any) => a.award === 'Melhor Jogador').length;
        const revelacao = awards.filter((a: any) => a.award === 'Revelação (Sub-21)').length;
        const luvaDeOuro = awards.filter((a: any) => a.award === 'Luva de Ouro').length;
        const selecaoDaTemporada = awards.filter((a: any) => a.award === 'Seleção da Temporada').length;
        const melhorDoMundo = p.bestPlayerInTheWorldAwards || 0;

        const totalPremios = artilheiro + maiorAssistente + melhorJogador + revelacao + luvaDeOuro + selecaoDaTemporada + melhorDoMundo;

        // Histórico de clubes
        const clubHistory = playerHistory?.clubHistory || [];
        const clubes = clubHistory.length > 0
            ? [...new Set(clubHistory.map((h: any) => h.teamName))].join('; ')
            : p.teamName || 'Sem histórico';

        // Nacionalidade em português
        const nationality = NATIONALITIES.find(n => n.code3 === p.nationalityId);
        const nacionalidade = nationality?.name || p.nationalityId;

        // Contar títulos coletivos
        const trophies = playerHistory?.trophies || new Map();
        let titulosLiga = 0;
        let titulosCopa = 0;
        let titulosInt = 0;

        trophies.forEach((trophy: any, name: string) => {
            const count = trophy.wins?.length || 0;
            // Ligas nacionais
            if (name.includes('1ª Divisão') || name.includes('La Liga') || name.includes('Premier League') ||
                name.includes('Bundesliga') || name.includes('Serie A') || name.includes('Ligue 1')) {
                titulosLiga += count;
            }
            // Copas nacionais
            else if (name.includes('Copa') && !name.includes('Libertadores') && !name.includes('Champions') &&
                !name.includes('Mundial') && !name.includes('Sulamericana') && !name.includes('Europa')) {
                titulosCopa += count;
            }
            // Internacionais
            else if (name.includes('Libertadores') || name.includes('Champions') || name.includes('Mundial') ||
                name.includes('Sulamericana') || name.includes('Europa League') || name.includes('Conference')) {
                titulosInt += count;
            }
        });

        const totalTitulos = titulosLiga + titulosCopa + titulosInt;

        return {
            numeroCamisa: p.number,
            nome: p.name,
            nacionalidade: nacionalidade,
            selecao: p.selecao,
            continenteSelecao: p.continenteSelecao,
            time: p.teamName || 'Sem Time',
            liga: league?.countryName || 'Desconhecida',
            divisao: division?.name || '-',
            continente: league?.continent || '-',
            idade: p.age,
            posicao: p.isGoalkeeper ? 'Goleiro' : 'Linha',
            overall: p.overall,
            valorMercado: p.marketValue,
            contrato: p.contractYears,
            // Stats Liga
            jogos: this.statsScope() === 'current' ? p.stats.matchesPlayed : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.stats?.matchesPlayed || 0), 0) : 0),
            gols: this.statsScope() === 'current' ? p.stats.goals : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.stats?.goals || 0), 0) : 0),
            assistencias: this.statsScope() === 'current' ? p.stats.assists : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.stats?.assists || 0), 0) : 0),
            mvps: this.statsScope() === 'current' ? p.stats.motm : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.stats?.motm || 0), 0) : 0),
            // Stats Copa
            jogosCopa: this.statsScope() === 'current' ? p.cupStats.matchesPlayed : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.cupStats?.matchesPlayed || 0), 0) : 0),
            golsCopa: this.statsScope() === 'current' ? p.cupStats.goals : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.cupStats?.goals || 0), 0) : 0),
            assistenciasCopa: this.statsScope() === 'current' ? p.cupStats.assists : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.cupStats?.assists || 0), 0) : 0),
            mvpsCopa: this.statsScope() === 'current' ? p.cupStats.motm : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.cupStats?.motm || 0), 0) : 0),
            // Stats Internacionais
            jogosInternacional: this.statsScope() === 'current' ? (p.internationalStats?.matchesPlayed || 0) : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.internationalStats?.matchesPlayed || 0), 0) : 0),
            golsInternacional: this.statsScope() === 'current' ? (p.internationalStats?.goals || 0) : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.internationalStats?.goals || 0), 0) : 0),
            assistenciasInternacional: this.statsScope() === 'current' ? (p.internationalStats?.assists || 0) : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.internationalStats?.assists || 0), 0) : 0),
            mvpsInternacional: this.statsScope() === 'current' ? (p.internationalStats?.motm || 0) : (Array.isArray(playerHistory?.careerStats) ? playerHistory.careerStats.reduce((sum: number, s: any) => sum + (s.internationalStats?.motm || 0), 0) : 0),
            // Totais
            totalJogos: this.statsScope() === 'current'
                ? p.stats.matchesPlayed + p.cupStats.matchesPlayed + (p.internationalStats?.matchesPlayed || 0)
                : (playerHistory?.totalCareerStats?.matchesPlayed || 0),
            totalGols: this.statsScope() === 'current'
                ? p.stats.goals + p.cupStats.goals + (p.internationalStats?.goals || 0)
                : (playerHistory?.totalCareerStats?.goals || 0),
            totalAssistencias: this.statsScope() === 'current'
                ? p.stats.assists + p.cupStats.assists + (p.internationalStats?.assists || 0)
                : (playerHistory?.totalCareerStats?.assists || 0),
            totalMVPs: this.statsScope() === 'current'
                ? p.stats.motm + p.cupStats.motm + (p.internationalStats?.motm || 0)
                : (playerHistory?.totalCareerStats?.motm || 0),
            // Prêmios Individuais
            premiosMelhorDoMundo: melhorDoMundo,
            premiosArtilheiro: artilheiro,
            premiosMaiorAssistente: maiorAssistente,
            premiosMelhorJogador: melhorJogador,
            premiosRevelacao: revelacao,
            premiosLuvaDeOuro: luvaDeOuro,
            premiosSelecaoDaTemporada: selecaoDaTemporada,
            totalPremios: totalPremios,
            // Títulos Coletivos
            titulosLigaNacional: titulosLiga,
            titulosCopaNacional: titulosCopa,
            titulosInternacionais: titulosInt,
            totalTitulos: totalTitulos,
            // Histórico
            clubesHistorico: clubes
        };
    }

    playersData = computed(() => []);
    u20PlayersData = computed(() => []);

    nationalPlayersData = computed(() => []);
    nationalU20PlayersData = computed(() => []);

    slotsData = computed(() => {
        if (this.reportType() !== 'slot_distribution') return null;
        return this.intCompService.getSlotDistribution();
    });

    // Dados dos times processados
    teamsData = computed(() => {
        // Só processar se o relatório de times estiver selecionado
        if (this.reportType() !== 'teams') {
            return [];
        }

        const leagues = this.universeService.leagues();
        const selectedLeague = this.selectedLeague();
        const teamsData: TeamReportData[] = [];

        const leaguesToProcess = selectedLeague === 'all'
            ? leagues
            : leagues.filter(l => l.countryId === selectedLeague);

        leaguesToProcess.forEach(league => {
            league.divisions.forEach(div => {
                div.teams.forEach(team => {
                    const avgAge = 25;
                    const avgOverall = team.overall;
                    const totalValue = team.budget;

                    // Contar títulos (sumarizado)
                    const trophies = team.trophies || [];
                    const nationalLeague = trophies.filter(t => t.type === 'national_league').reduce((sum, t) => sum + t.count, 0);
                    const nationalCup = trophies.filter(t => t.type === 'national_cup').reduce((sum, t) => sum + t.count, 0);
                    const international = trophies.filter(t => t.type === 'international' || t.type === 'world').reduce((sum, t) => sum + t.count, 0);

                    // Buscar histórico detalhado de títulos
                    const detailedTitles: string[] = [];

                    // 1. Histórico Nacional (buscando em todas as ligas para garantir)
                    const allLeagues = this.universeService.leagues();
                    allLeagues.forEach(l => {
                        l.history.forEach(h => {
                            if (h.division1?.champion?.id === team.id) detailedTitles.push(`1ª Divisão (Temp ${h.season})`);
                            if (h.division2?.champion?.id === team.id) detailedTitles.push(`2ª Divisão (Temp ${h.season})`);
                            if (h.division3?.champion?.id === team.id) detailedTitles.push(`3ª Divisão (Temp ${h.season})`);
                            if (h.division4?.champion?.id === team.id) detailedTitles.push(`4ª Divisão (Temp ${h.season})`);
                            if (h.cup?.champion?.id === team.id) detailedTitles.push(`Copa Nacional (Temp ${h.season})`);
                            if (h.leagueCup?.champion?.id === team.id) detailedTitles.push(`Copa da Liga (Temp ${h.season})`);
                        });
                    });

                    // 2. Histórico Internacional
                    const intComps = this.universeService.internationalCompetitions();
                    intComps.forEach(comp => {
                        comp.history.forEach(h => {
                            if (h.champion?.id === team.id) {
                                detailedTitles.push(`${comp.name} (Temp ${h.season})`);
                            }
                        });
                    });

                    // Ordenar títulos por temporada (decrescente)
                    // Como a string é "Titulo (Temp Season)", ajustamos o regex
                    detailedTitles.sort((a, b) => {
                        const seasonA = parseInt(a.match(/\(Temp (\d+)\)/)?.[1] || '0');
                        const seasonB = parseInt(b.match(/\(Temp (\d+)\)/)?.[1] || '0');
                        return seasonB - seasonA;
                    });

                    teamsData.push({
                        time: team.teamName,
                        liga: league.countryName,
                        overall: team.overall,
                        orcamento: team.budget,
                        numeroJogadores: 0,
                        idadeMedia: Math.round(avgAge * 10) / 10,
                        overallMedio: Math.round(avgOverall * 10) / 10,
                        valorTotalElenco: totalValue,
                        // Títulos
                        titulosLigaNacional: nationalLeague,
                        titulosCopaNacional: nationalCup,
                        titulosInternacionais: international,
                        titulosTotal: nationalLeague + nationalCup + international,
                        historicoTitulos: detailedTitles.join('; ')
                    });
                });
            });
        });

        return teamsData.sort((a, b) => b.overall - a.overall);
    });

    // Dados de estatísticas de ligas (Top 10)
    leagueStatsData = computed(() => {
        // Só processar se o relatório de stats estiver selecionado
        if (this.reportType() !== 'league_stats') {
            return [];
        }

        const leagues = this.universeService.leagues();
        const selectedLeague = this.selectedLeague();
        const statsData: LeagueStatsData[] = [];
        const currentSeason = this.universeService.season();

        const leaguesToProcess = selectedLeague === 'all'
            ? leagues
            : leagues.filter(l => l.countryId === selectedLeague);

        // Função helper para encontrar o time do jogador
        const findPlayerTeam = (playerId: string, league: any): string => {
            for (const div of league.divisions) {
                for (const team of div.teams) {
                    if (team.players.some((p: any) => p.id === playerId)) {
                        return team.teamName;
                    }
                }
            }
            return 'Time Desconhecido';
        };

        leaguesToProcess.forEach(league => {
            // Top 10 da Liga Nacional (1ª Divisão)
            if (league.divisions[0]?.topScorers) {
                league.divisions[0].topScorers.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: league.countryName,
                        competicao: '1ª Divisão',
                        temporada: currentSeason,
                        tipo: 'Artilheiro',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeam(player.id, league),
                        valor: player.stats.goals
                    });
                });
            }

            if (league.divisions[0]?.topAssists) {
                league.divisions[0].topAssists.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: league.countryName,
                        competicao: '1ª Divisão',
                        temporada: currentSeason,
                        tipo: 'Assistente',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeam(player.id, league),
                        valor: player.stats.assists
                    });
                });
            }

            if (league.divisions[0]?.topMotm) {
                league.divisions[0].topMotm.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: league.countryName,
                        competicao: '1ª Divisão',
                        temporada: currentSeason,
                        tipo: 'MVP',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeam(player.id, league),
                        valor: player.stats.motm
                    });
                });
            }

            // Top 10 da Copa Nacional
            if (league.cup?.topScorers) {
                league.cup.topScorers.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: league.countryName,
                        competicao: 'Copa Nacional',
                        temporada: currentSeason,
                        tipo: 'Artilheiro',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeam(player.id, league),
                        valor: player.cupStats.goals
                    });
                });
            }

            if (league.cup?.topAssists) {
                league.cup.topAssists.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: league.countryName,
                        competicao: 'Copa Nacional',
                        temporada: currentSeason,
                        tipo: 'Assistente',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeam(player.id, league),
                        valor: player.cupStats.assists
                    });
                });
            }

            if (league.cup?.topMotm) {
                league.cup.topMotm.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: league.countryName,
                        competicao: 'Copa Nacional',
                        temporada: currentSeason,
                        tipo: 'MVP',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeam(player.id, league),
                        valor: player.cupStats.motm
                    });
                });
            }
        });

        // Função helper para encontrar o time do jogador em todas as ligas
        const findPlayerTeamGlobal = (playerId: string): string => {
            for (const league of leagues) {
                for (const div of league.divisions) {
                    for (const team of div.teams) {
                        if (team.players.some((p: any) => p.id === playerId)) {
                            return team.teamName;
                        }
                    }
                }
            }
            return 'Time Desconhecido';
        };

        // Top 10 das Competições Internacionais
        const intComps = this.universeService.internationalCompetitions();
        intComps.forEach(comp => {
            if (comp.topScorers) {
                comp.topScorers.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: 'Internacional',
                        competicao: comp.name,
                        temporada: currentSeason,
                        tipo: 'Artilheiro',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeamGlobal(player.id),
                        valor: player.internationalStats?.goals || 0
                    });
                });
            }

            if (comp.topAssists) {
                comp.topAssists.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: 'Internacional',
                        competicao: comp.name,
                        temporada: currentSeason,
                        tipo: 'Assistente',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeamGlobal(player.id),
                        valor: player.internationalStats?.assists || 0
                    });
                });
            }

            if (comp.topMotm) {
                comp.topMotm.slice(0, 10).forEach((player, index) => {
                    const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                    statsData.push({
                        liga: 'Internacional',
                        competicao: comp.name,
                        temporada: currentSeason,
                        tipo: 'MVP',
                        posicao: index + 1,
                        jogador: player.name,
                        nacionalidade: nat?.name || player.nationalityId,
                        time: findPlayerTeamGlobal(player.id),
                        valor: player.internationalStats?.motm || 0
                    });
                });
            }
        });

        return statsData;
    });

    // Dados de partidas
    matchesData = computed(() => {
        // Só processar se o relatório de partidas estiver selecionado
        if (this.reportType() !== 'matches') {
            return [];
        }

        const leagues = this.universeService.leagues();
        const selectedLeague = this.selectedLeague();
        const matchesData: MatchData[] = [];
        const currentSeason = this.universeService.season();

        const leaguesToProcess = selectedLeague === 'all'
            ? leagues
            : leagues.filter(l => l.countryId === selectedLeague);

        leaguesToProcess.forEach(league => {
            // Partidas da Liga
            league.divisions.forEach(div => {
                div.fixtures.forEach((round, roundIndex) => {
                    round.forEach(match => {
                        matchesData.push({
                            liga: league.countryName,
                            competicao: div.name,
                            temporada: currentSeason,
                            rodada: roundIndex + 1,
                            timeCasa: match.homeTeam.teamName,
                            timeVisitante: match.awayTeam.teamName,
                            golsCasa: match.homeScore || 0,
                            golsVisitante: match.awayScore || 0,
                            data: `Temp ${currentSeason} - R${roundIndex + 1}`
                        });
                    });
                });
            });

            // Partidas da Copa
            if (league.cup?.rounds) {
                league.cup.rounds.forEach((round, roundIndex) => {
                    round.matches.forEach(match => {
                        // Somar gols das duas pernas
                        const golsCasa = (match.homeScoreLeg1 || 0) + (match.homeScoreLeg2 || 0);
                        const golsVisitante = (match.awayScoreLeg1 || 0) + (match.awayScoreLeg2 || 0);

                        matchesData.push({
                            liga: league.countryName,
                            competicao: 'Copa Nacional',
                            temporada: currentSeason,
                            rodada: roundIndex + 1,
                            timeCasa: match.homeTeam.teamName,
                            timeVisitante: match.awayTeam.teamName,
                            golsCasa: golsCasa,
                            golsVisitante: golsVisitante,
                            data: `Temp ${currentSeason} - ${round.name}`
                        });
                    });
                });
            }
        });

        return matchesData;
    });

    // Dados de transferências
    transfersData = computed(() => {
        // Só processar se o relatório de transferências estiver selecionado
        if (this.reportType() !== 'transfers') {
            return [];
        }

        const transfersData: TransferData[] = [];
        const currentSeason = this.universeService.season();

        // Buscar transferências do histórico
        const leagues = this.universeService.leagues();

        leagues.forEach(league => {
            league.divisions.forEach(div => {
                div.teams.forEach(team => {
                    team.players.forEach(player => {
                        const history = this.universeService.getPlayerHistory(player.id);
                        const clubHistory = history?.clubHistory || [];

                        // Processar histórico de clubes para identificar transferências
                        for (let i = 1; i < clubHistory.length; i++) {
                            const current = clubHistory[i];
                            const previous = clubHistory[i - 1];

                            if (current.teamName !== previous.teamName) {
                                const nat = NATIONALITIES.find(n => n.code3 === player.nationalityId);
                                transfersData.push({
                                    temporada: current.season,
                                    jogador: player.name,
                                    nacionalidade: nat?.name || player.nationalityId,
                                    overall: player.overall,
                                    timeOrigem: previous.teamName,
                                    timeDestino: current.teamName,
                                    valorTransferencia: player.marketValue, // Aproximação
                                    tipoTransferencia: 'Transferência'
                                });
                            }
                        }
                    });
                });
            });
        });

        return transfersData.sort((a, b) => b.temporada - a.temporada);
    });

    // Dados de histórico de campeões
    championsData = computed(() => {
        // Só processar se o relatório de campeões estiver selecionado
        if (this.reportType() !== 'champions') {
            return [];
        }

        const championsData: ChampionsData[] = [];
        const leagues = this.universeService.leagues();
        const selectedLeague = this.selectedLeague();

        const leaguesToProcess = selectedLeague === 'all'
            ? leagues
            : leagues.filter(l => l.countryId === selectedLeague);

        // Mapa auxiliar para contar títulos já encontrados no histórico e evitar duplicatas com os manuais
        // TeamID -> TrophyType -> Count
        const registeredTitles = new Map<string, Map<string, number>>();

        const registerTitle = (teamId: string, type: string) => {
            if (!registeredTitles.has(teamId)) registeredTitles.set(teamId, new Map());
            const types = registeredTitles.get(teamId)!;
            types.set(type, (types.get(type) || 0) + 1);
        };

        // 1. Processar Ligas Nacionais (Histórico Oficial)
        leaguesToProcess.forEach(league => {
            league.history.forEach(h => {
                const addChamp = (compName: string, winner: any, type: string) => {
                    if (winner) {
                        registerTitle(winner.id, type);
                        championsData.push({
                            temporada: h.season,
                            liga: league.countryName,
                            competicao: `${compName} (${league.countryName})`,
                            campeao: winner.teamName,
                            viceCampeao: '-'
                        });
                    }
                };

                addChamp(h.division1?.name || '1ª Divisão', h.division1?.champion, 'national_league');
                addChamp(h.division2?.name || '2ª Divisão', h.division2?.champion, 'lower_division');
                addChamp(h.division3?.name || '3ª Divisão', h.division3?.champion, 'lower_division');
                addChamp(h.division4?.name || '4ª Divisão', h.division4?.champion, 'lower_division');
                addChamp(h.cup?.name || 'Copa Nacional', h.cup?.champion, 'national_cup');
                addChamp(h.leagueCup?.name || 'Copa da Liga', h.leagueCup?.champion, 'national_cup');
            });
        });

        // 2. Processar Internacionais (Histórico Oficial)
        const intComps = this.universeService.internationalCompetitions();
        intComps.forEach(comp => {
            comp.history.forEach(h => {
                if (h.champion) {
                    if (selectedLeague === 'all' || h.champion.countryId === selectedLeague) {
                        // Determinar tipo
                        const type = comp.id.includes('WORLD') ? 'world' : 'international';
                        registerTitle(h.champion.id, type);

                        championsData.push({
                            temporada: h.season,
                            liga: 'Internacional',
                            competicao: comp.name,
                            campeao: h.champion.teamName,
                            viceCampeao: '-'
                        });
                    }
                }
            });
        });

        // 3. Adicionar Títulos Manuais (Diferença entre Histórico e Estante de Troféus)
        leaguesToProcess.forEach(league => {
            league.divisions.forEach(div => {
                div.teams.forEach(team => {
                    if (!team.trophies) return;
                    const teamCounts = registeredTitles.get(team.id) || new Map();

                    team.trophies.forEach(t => {
                        const type = t.type;
                        const registeredCount = teamCounts.get(type) || 0;

                        // Se time tem mais títulos na estante do que no histórico, listamos a diferença
                        if (t.count > registeredCount) {
                            const diff = t.count - registeredCount;
                            // Evitar adicionar muitos registros se for um bug, limitar razoavelmente
                            if (diff > 0) {
                                // Resolver nome correto baseado no tipo e na liga para unificar com os oficiais
                                let finalName = t.name;
                                if (type === 'national_league') {
                                    finalName = `${league.divisions[0]?.name || '1ª Divisão'} (${league.countryName})`;
                                } else if (type === 'national_cup') {
                                    // Para copas (Copa, Supercopa, Copa da Liga), usamos o nome do troféu + país
                                    finalName = `${t.name} (${league.countryName})`;
                                }

                                // Assumindo que esses títulos são antigos/manuais
                                championsData.push({
                                    temporada: 0, // 0 indica "Histórico/Manual"
                                    liga: league.countryName,
                                    competicao: `${finalName} (Histórico/Manual)`,
                                    campeao: team.teamName,
                                    viceCampeao: '-'
                                });
                                // Atualizar contagem para não duplicar se houver outro troféu do mesmo tipo
                                teamCounts.set(type, registeredCount + diff);
                            }
                        }
                    });
                });
            });
        });

        return championsData.sort((a, b) => b.temporada - a.temporada);
    });


    // Contador de registros
    recordCount = computed(() => {
        const type = this.reportType();
        if (type === 'players') return this.playersData().length;
        if (type === 'u20_players') return this.u20PlayersData().length;
        if (type === 'national_players') return this.nationalPlayersData().length;
        if (type === 'national_u20_players') return this.nationalU20PlayersData().length;
        if (type === 'teams') return this.teamsData().length;
        if (type === 'league_stats') return this.leagueStatsData().length;
        if (type === 'matches') return this.matchesData().length;
        if (type === 'transfers') return this.transfersData().length;
        if (type === 'champions') return this.championsData().length;
        if (type === 'slot_distribution') return this.slotsData() ? Object.keys(this.slotsData()!).length : 0;
        return 0;
    });

    // Exportar para CSV
    exportToCSV() {
        const type = this.reportType();
        let data: any[] = [];

        if (type === 'slot_distribution') {
            const raw = this.slotsData();
            if (raw) {
                Object.values(raw).forEach((continent: any) => {
                    if (continent.clubCompetitions) {
                        continent.clubCompetitions.forEach((c: any) => {
                            data.push({
                                Continente: continent.name,
                                Categoria: 'Clubes',
                                Rank: c.rank,
                                Regra: c.description,
                                Paises: c.countries ? this.getCountryNames(c.countries).join('; ') : ''
                            });
                        });
                    }
                    if (continent.nationalCompetitions) {
                        continent.nationalCompetitions.forEach((n: any) => {
                            data.push({
                                Continente: continent.name,
                                Categoria: 'Seleções',
                                Rank: n.name,
                                Regra: n.description,
                                Paises: ''
                            });
                        });
                    }
                });
            }
        }
        else if (type === 'players') data = this.playersData();
        else if (type === 'u20_players') data = this.u20PlayersData();
        else if (type === 'national_players') data = this.nationalPlayersData();
        else if (type === 'national_u20_players') data = this.nationalU20PlayersData();
        else if (type === 'teams') data = this.teamsData();
        else if (type === 'league_stats') data = this.leagueStatsData();
        else if (type === 'matches') data = this.matchesData();
        else if (type === 'transfers') data = this.transfersData();
        else if (type === 'champions') data = this.championsData();
        if (data.length === 0) {
            alert('Nenhum dado para exportar!');
            return;
        }

        // Criar cabeçalho
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = (row as any)[header];
                    // Escapar valores com vírgula
                    return typeof value === 'string' && value.includes(',')
                        ? `"${value}"`
                        : value;
                }).join(',')
            )
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const filename = `relatorio_${this.reportType()}_temp${this.universeService.season()}_${Date.now()}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Exportar para JSON
    exportToJSON() {
        const type = this.reportType();
        let data: any[] = [];

        if (type === 'slot_distribution') {
            const raw = this.slotsData();
            data = raw ? Object.values(raw) : [];
        }
        else if (type === 'players') data = this.playersData();
        else if (type === 'u20_players') data = this.u20PlayersData();
        else if (type === 'national_players') data = this.nationalPlayersData();
        else if (type === 'national_u20_players') data = this.nationalU20PlayersData();
        else if (type === 'teams') data = this.teamsData();
        else if (type === 'league_stats') data = this.leagueStatsData();
        else if (type === 'matches') data = this.matchesData();
        else if (type === 'transfers') data = this.transfersData();
        else if (type === 'champions') data = this.championsData();
        else if (type === 'league_stats') data = this.leagueStatsData();
        else if (type === 'matches') data = this.matchesData();
        else if (type === 'transfers') data = this.transfersData();
        else if (type === 'champions') data = this.championsData();
        if (data.length === 0) {
            alert('Nenhum dado para exportar!');
            return;
        }

        const jsonContent = JSON.stringify({
            tipo: this.reportType(),
            temporada: this.universeService.season(),
            dataExportacao: new Date().toISOString(),
            totalRegistros: data.length,
            dados: data
        }, null, 2);

        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const filename = `relatorio_${this.reportType()}_temp${this.universeService.season()}_${Date.now()}.json`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Executar exportação
    generateReport() {
        if (this.exportFormat() === 'csv') {
            this.exportToCSV();
        } else {
            this.exportToJSON();
        }
    }
}
