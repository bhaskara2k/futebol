import { Injectable, inject } from '@angular/core';
import { FirebasePersistenceService } from './firebase-persistence.service';
import { UniverseService } from './universe.service';
import { HistoricMatch } from '../models';

import { CompetitionService } from './competition.service';
import { InternationalCompetitionService } from './international-competition.service';

@Injectable({ providedIn: 'root' })
export class SeasonLifecycleService {
    private firebaseService = inject(FirebasePersistenceService);
    private universeService = inject(UniverseService);
    private competitionService = inject(CompetitionService);
    private internationalService = inject(InternationalCompetitionService);

    // Estado interno
    private currentSeasonStarted = false;
    private lastSavedRound = 0;
    private currentSaveId: string | null = null;

    setSaveId(id: string) {
        this.currentSaveId = id;
    }

    getSaveId(): string | null {
        return this.currentSaveId;
    }

    /**
     * 1️⃣ INICIA UMA NOVA TEMPORADA
     */
    async startSeason(): Promise<void> {
        const season = this.universeService.season();
        console.log(`🎬 Iniciando temporada ${season}...`);
        this.currentSeasonStarted = true;
        this.lastSavedRound = 0;
    }

    /**
     * 2️⃣ SALVA UMA RODADA (Sincroniza com Firebase)
     */
    async saveRound(roundNumber: number): Promise<any> {
        if (!this.currentSaveId) return;

        const state = {
            season: this.universeService.season(),
            teams: this.universeService.teams(),
            leagues: this.universeService.leagues(),
            internationalComps: this.universeService.internationalCompetitions(),
            summaries: this.universeService.seasonSummaries()
        };

        await this.firebaseService.saveGame(this.currentSaveId, state);
        this.lastSavedRound = roundNumber;
        return { success: true };
    }

    /**
     * 3️⃣ FINALIZA A TEMPORADA (O GRANDE MOMENTO)
     * 
     * - Extrai Títulos/Vices/Promoções
     * - Evolui Overalls
     * - Limpa Dados Temporários
     * - Salva no Firebase
     */
    async endSeason(): Promise<any> {
        const season = this.universeService.season();
        console.log(`🏁 Finalizando temporada ${season} e preparando evolução...`);

        try {
            // A. Registrar Histórico e Rankings Permanentes (Hall da Fama)
            this.universeService.leagues.update(leagues => {
                leagues.forEach(league => {
                    this.competitionService.captureSeasonHistory(league);
                });
                return [...leagues];
            });

            this.universeService.internationalCompetitions.update(intComps => {
                intComps.forEach(comp => {
                    if (comp.status === 'finished') {
                        this.internationalService.captureInternationalHistory(comp);
                    }
                });
                return [...intComps];
            });

            // B. Extrair Resumo da Temporada para o sinal de resumos
            const summary = this.extractSeasonSummary(this.universeService.season());
            this.universeService.seasonSummaries.update(s => [...s, summary]);

            // B. Evoluir Overalls (Dynasty Engine)
            this.universeService.processYearlyEvolution();

            // C. Incrementar Temporada
            this.universeService.season.update(s => s + 1);

            // E. Salvar Estado Final no Firebase
            if (this.currentSaveId) {
                const state = {
                    season: this.universeService.season(),
                    teams: this.universeService.teams(),
                    leagues: this.universeService.leagues(),
                    internationalComps: this.universeService.internationalCompetitions(),
                    summaries: this.universeService.seasonSummaries()
                };
                await this.firebaseService.saveGame(this.currentSaveId, state);
            }

            this.currentSeasonStarted = false;
            console.log(`✅ Evolução completa! Bem-vindo à Temporada ${season + 1}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao finalizar temporada:', error);
            return { success: false, error };
        }
    }

    private extractSeasonSummary(season: number) {
        const leagues = this.universeService.leagues();
        const summary: any = { season, leagues: [] };

        leagues.forEach(league => {
            league.divisions.forEach((div, idx) => {
                const sortedTeams = [...div.teams].sort((a, b) => b.stats.points - a.stats.points);
                
                // Rebaixados: vem da própria divisão (slots de rebaixamento)
                const rCount = div.relegationSlots ?? 0;
                
                // Promovidos: vem da divisão abaixo (quem sobe é quem a de cima rebaixou)
                // Se for a divisão 0 (idx=0), ninguém sobe para ela de uma divisão superior.
                // Mas times da divisão 1 (idx=1) sobem para a 0.
                // O número de times que sobem para a div[idx] é o relegationSlots da div[idx-1] (se idx > 0)
                // Espera, a lógica é: se estou na Divisão 1, os "promovidos" são os que sobem para a Divisão 0?
                // Não, geralmente o histórico mostra quem FOI promovido DESTA divisão para a de cima.
                // Então, se estou na Divisão 1, os promovidos são os que vão para a Divisão 0.
                // Esse número é o relegationSlots da Divisão 0.
                
                const pCount = idx > 0 ? (league.divisions[idx - 1].relegationSlots ?? 0) : 0;

                summary.leagues.push({
                    leagueName: league.countryName,
                    division: div.name,
                    champion: sortedTeams[0]?.teamName,
                    runnerUp: sortedTeams[1]?.teamName,
                    relegated: (idx < league.divisions.length - 1 && rCount > 0) ? sortedTeams.slice(-rCount).map(t => t.teamName) : [],
                    promoted: (idx > 0 && pCount > 0) ? sortedTeams.slice(0, pCount).map(t => t.teamName) : []
                });
            });
        });

        return summary;
    }

    private cleanupForNextSeason() {
        // Resetar estatísticas de todos os times para 0
        const teams = this.universeService.teams();
        teams.forEach(t => {
            t.stats = {
                matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
                goalsFor: 0, goalsAgainst: 0, points: 0
            };
        });
        
        // Limpar histórico de jogos e transferências da temporada passada
        this.universeService.matchHistory.set([]);
        this.universeService.transferHistory.set([]);
    }

    syncStateAfterLoad(): void {
        const leagues = this.universeService.leagues();
        if (leagues.length > 0) {
            this.currentSeasonStarted = true;
            this.lastSavedRound = leagues[0].currentRound;
        }
    }
}
