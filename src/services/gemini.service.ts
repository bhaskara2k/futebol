import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { Team, Player, Match, H2HData, Trophy } from '../models';
import { UniverseService } from './universe.service';

type ScenarioType = 'Blockbuster' | 'TopPoachesLower' | 'NouveauRiche' | 'IntraTier';

interface TransferScenario {
  player: Player;
  sellingTeam: Team;
  buyingTeam: Team;
  type: ScenarioType;
}

export interface NewsArticle {
  title: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private universeService = inject(UniverseService);
  
  // prettier-ignore
  private readonly LEAGUE_TIERS = new Map<string, number>([
    // Tier 1
    ['ESP', 1], ['ENG', 1], ['ITA', 1], ['GER', 1], ['FRA', 1], ['BRA', 1],
    // Tier 2
    ['POR', 2], ['NED', 2], ['RUS', 2], ['ARG', 2],
    // Tier 3
    ['TUR', 3], ['BEL', 3], ['SUI', 3], ['GRE', 3], ['UKR', 3], ['AUT', 3], ['DNK', 3], ['SCO', 3], ['NOR', 3], ['SWE', 3],
    ['USA', 3], ['MEX', 3], ['JPN', 3], ['AUS', 3], ['SAU', 3], ['QAT', 3], ['ARE', 3], ['KOR', 3], ['CHN', 3],
    // Tier 4 - all others will default to 4
  ]);


  constructor() {
    try {
      if (process.env.API_KEY) {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      } else {
        console.error("API_KEY environment variable not set. GeminiService will be disabled.");
      }
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI.", e);
    }
  }

  async generateTransferRumors(teams: Team[], count: number = 5): Promise<NewsArticle[]> {
    if (!this.ai) {
      throw new Error("Gemini AI client not initialized. Is the API_KEY configured correctly?");
    }

    const scenarios = this._findPlausibleScenarios(teams, count);
    if (scenarios.length === 0) {
      return [{ title: "Mercado Parado", content: "O mercado de transferências está quieto. Nenhum rumor interessante no momento." }];
    }
    
    const prompt = this._createBatchRumorPrompt(scenarios);
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    const jsonStr = response.text.trim();
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from Gemini for rumors:", e);
      return [{ title: "Erro de Comunicação", content: "Não foi possível obter os rumores do nosso correspondente. Tente novamente." }];
    }
  }

  async generateTeamFormAnalysis(count: number = 1): Promise<NewsArticle[]> {
     if (!this.ai) throw new Error("Gemini AI client not initialized.");

     const teamAndContext = this._findTeamWithInterestingForm();
     if (!teamAndContext) {
         return [{ title: "Tudo Calmo", content: "Nenhuma equipe apresentou uma performance digna de nota recentemente. O campeonato segue equilibrado." }];
     }

     const { team, leagueName, position, recentMatches } = teamAndContext;
     
     const prompt = `
      Escreva uma curta análise jornalística sobre a forma atual da equipe de futsal "${team.teamName}".

      Contexto:
      - Equipe: ${team.teamName}
      - Liga: ${leagueName}
      - Posição Atual: ${position}º lugar
      - Últimos ${recentMatches.length} resultados (V=Vitória, E=Empate, D=Derrota): ${recentMatches.map(m => `${m.result} (${m.score})`).join(', ')}
      - Jogadores chave: ${team.players.slice(0, 5).map(p => p.name).join(', ')}.

      Instruções:
      - Analise se a equipe está em boa fase, má fase ou inconsistente com base nos resultados.
      - Mencione a posição na tabela e o que isso significa para as ambições do time (título, classificação, rebaixamento).
      - Crie um título chamativo para a matéria.
      - Retorne a resposta em formato JSON com as chaves "title" e "content".
     `;

     const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                }
            }
        }
     });

     const jsonStr = response.text.trim();
     try {
         return [JSON.parse(jsonStr)];
     } catch(e) {
        console.error("Failed to parse JSON from Gemini for team analysis:", e);
        return [{ title: "Erro de Análise", content: "Nossos analistas não conseguiram compilar os dados. Tente mais tarde." }];
     }
  }

  async generateMatchPreview(count: number = 1): Promise<NewsArticle[]> {
    if (!this.ai) throw new Error("Gemini AI client not initialized.");

    const matchContext = this._findImportantUpcomingMatch();
    if (!matchContext) {
        return [{ title: "Sem Grandes Jogos", content: "A próxima rodada não apresenta confrontos de grande destaque. A expectativa é por jogos equilibrados." }];
    }

    const { match, competitionName, homeTeamPosition, awayTeamPosition } = matchContext;

    const prompt = `
    Escreva uma prévia jornalística para uma partida de futsal importante.

    Contexto:
    - Partida: ${match.homeTeam.teamName} vs ${match.awayTeam.teamName}
    - Competição: ${competitionName}
    - Posição ${match.homeTeam.teamName}: ${homeTeamPosition ? `${homeTeamPosition}º lugar` : 'N/A'}
    - Posição ${match.awayTeam.teamName}: ${awayTeamPosition ? `${awayTeamPosition}º lugar` : 'N/A'}
    - Principais jogadores (Casa): ${match.homeTeam.players.slice(0, 3).map(p => p.name).join(', ')}
    - Principais jogadores (Fora): ${match.awayTeam.players.slice(0, 3).map(p => p.name).join(', ')}

    Instruções:
    - Analise a importância da partida (briga por título, clássico, final).
    - Compare brevemente as duas equipes.
    - Crie um título empolgante para a prévia.
    - Retorne a resposta em formato JSON com as chaves "title" e "content".
    `;
    
     const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                }
            }
        }
     });

     const jsonStr = response.text.trim();
     try {
         return [JSON.parse(jsonStr)];
     } catch(e) {
        console.error("Failed to parse JSON from Gemini for match preview:", e);
        return [{ title: "Informação Indisponível", content: "Não foi possível obter detalhes sobre as próximas partidas." }];
     }
  }
  
  async generateRivalryAnalysis(teamA: Team, teamB: Team, h2h: H2HData, trophies: { teamA: number, teamB: number }): Promise<NewsArticle> {
    if (!this.ai) throw new Error("Gemini AI client not initialized.");

    const prompt = `
      Você é um comentarista esportivo experiente. Escreva uma análise curta e impactante sobre a rivalidade histórica no futsal entre ${teamA.teamName} e ${teamB.teamName}.

      Contexto da Rivalidade:
      - Confronto Direto: ${teamA.teamName} ${h2h.teamAWins} vitórias, ${teamB.teamName} ${h2h.teamBWins} vitórias, ${h2h.draws} empates.
      - Total de Títulos (Principais): ${teamA.teamName} tem ${trophies.teamA} títulos, ${teamB.teamName} tem ${trophies.teamB} títulos.

      Instruções:
      - Crie um título forte e chamativo para a análise.
      - No conteúdo, analise o equilíbrio ou domínio no confronto direto.
      - Compare a galeria de troféus.
      - Termine com uma frase que capture a essência da rivalidade (ex: "Um clássico que para o país", "Uma batalha de Davi contra Golias", etc.).
      - O tom deve ser jornalístico e emocionante.
      - Retorne a resposta em formato JSON com as chaves "title" e "content".
    `;

    const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                }
            }
        }
    });

    const jsonStr = response.text.trim();
    try {
        return JSON.parse(jsonStr);
    } catch(e) {
        console.error("Failed to parse JSON from Gemini for rivalry analysis:", e);
        return { title: "Análise Indisponível", content: "Nossos comentaristas não estão disponíveis no momento para analisar este confronto." };
    }
  }

  private _findPlausibleScenarios(allTeams: Team[], count: number): TransferScenario[] {
    const scenarios: TransferScenario[] = [];
    const usedScenarioKeys = new Set<string>();
    const teams = allTeams.filter(t => t.countryId !== 'AAA' && t.countryId !== 'BBB' && t.players.length > 0);
    if (teams.length < 2) return [];

    const teamsByTier: { [tier: number]: Team[] } = { 1: [], 2: [], 3: [], 4: [] };
    teams.forEach(team => {
        const tier = this.LEAGUE_TIERS.get(team.countryId) || 4;
        teamsByTier[tier].push(team);
    });

    const scenarioGenerators = [
        { type: 'TopPoachesLower', weight: 0.5, generator: () => this._generateTopPoachesLower(teamsByTier) },
        { type: 'NouveauRiche', weight: 0.2, generator: () => this._generateNouveauRiche(teamsByTier) },
        { type: 'IntraTier', weight: 0.2, generator: () => this._generateIntraTier(teamsByTier) },
        { type: 'Blockbuster', weight: 0.1, generator: () => this._generateBlockbuster(teamsByTier) },
    ];

    let attempts = 0;
    while (scenarios.length < count && attempts < count * 10) {
        const rand = Math.random();
        let cumulativeWeight = 0;
        
        for (const s of scenarioGenerators) {
            cumulativeWeight += s.weight;
            if (rand <= cumulativeWeight) {
                const scenario = s.generator();
                if (scenario) {
                    const key = `${scenario.player.id}-${scenario.buyingTeam.id}`;
                    if (!usedScenarioKeys.has(key)) {
                        scenarios.push({ ...scenario, type: s.type as ScenarioType });
                        usedScenarioKeys.add(key);
                    }
                }
                break;
            }
        }
        attempts++;
    }

    return scenarios;
  }
  
  private _getRandomTeam(teams: Team[]): Team | null {
    if (teams.length === 0) return null;
    return teams[Math.floor(Math.random() * teams.length)];
  }

  private _generateBlockbuster(teamsByTier: { [tier: number]: Team[] }): Omit<TransferScenario, 'type'> | null {
      if (teamsByTier[1].length < 2) return null;
      
      const sellingTeam = this._getRandomTeam(teamsByTier[1]);
      const buyingTeam = this._getRandomTeam(teamsByTier[1].filter(t => t.id !== sellingTeam?.id));
      if (!sellingTeam || !buyingTeam) return null;
      
      const player = sellingTeam.players.filter(p => p.overall >= 90).sort((a,b) => b.overall - a.overall)[0];
      if (!player) return null;
      
      return { player, sellingTeam, buyingTeam };
  }

  private _generateTopPoachesLower(teamsByTier: { [tier: number]: Team[] }): Omit<TransferScenario, 'type'> | null {
      const topTiers = [...teamsByTier[1], ...teamsByTier[2]];
      const lowerTiers = [...teamsByTier[3], ...teamsByTier[4]];
      if (topTiers.length === 0 || lowerTiers.length === 0) return null;

      const buyingTeam = this._getRandomTeam(topTiers);
      const sellingTeam = this._getRandomTeam(lowerTiers);
      if (!sellingTeam || !buyingTeam || sellingTeam.id === buyingTeam.id) return null;

      const player = sellingTeam.players.filter(p => p.overall >= 82).sort((a,b) => b.overall - a.overall)[0];
      if (!player) return null;

      return { player, sellingTeam, buyingTeam };
  }

  private _generateNouveauRiche(teamsByTier: { [tier: number]: Team[] }): Omit<TransferScenario, 'type'> | null {
      const topTiers = [...teamsByTier[1], ...teamsByTier[2]];
      const richLowerTiers = [...teamsByTier[3], ...teamsByTier[4]]
        .sort((a,b) => b.budget - a.budget)
        .slice(0, 10); // Top 10 richest from lower tiers

      if (topTiers.length === 0 || richLowerTiers.length === 0) return null;

      const buyingTeam = this._getRandomTeam(richLowerTiers);
      const sellingTeam = this._getRandomTeam(topTiers);
      if (!sellingTeam || !buyingTeam) return null;

      // Target experienced players
      const player = sellingTeam.players.filter(p => p.overall >= 84 && p.age >= 28).sort((a,b) => b.marketValue - a.marketValue)[0];
      if (!player) return null;

      return { player, sellingTeam, buyingTeam };
  }
  
  private _generateIntraTier(teamsByTier: { [tier: number]: Team[] }): Omit<TransferScenario, 'type'> | null {
      const tier = [1,2,3,4][Math.floor(Math.random() * 4)];
      if (teamsByTier[tier].length < 2) return null;
      
      const sellingTeam = this._getRandomTeam(teamsByTier[tier]);
      const buyingTeam = this._getRandomTeam(teamsByTier[tier].filter(t => t.id !== sellingTeam?.id));
      if (!sellingTeam || !buyingTeam) return null;

      // A good player, but not necessarily a world-beater
      const player = sellingTeam.players.filter(p => p.overall >= 80).sort((a,b) => b.overall - a.overall)[0];
      if (!player) return null;
      
      return { player, sellingTeam, buyingTeam };
  }

  private _createBatchRumorPrompt(scenarios: TransferScenario[]): string {
      const scenarioTexts = scenarios.map((scenario, index) => {
          let specificInstruction = "";
          switch (scenario.type) {
              case 'Blockbuster':
                  specificInstruction = `Descreva como uma transferência 'bombástica' que pode abalar o mercado.`;
                  break;
              case 'NouveauRiche':
                  specificInstruction = `Enfatize que ${scenario.buyingTeam.teamName} tem um novo projeto financeiro e está disposto a oferecer um salário altíssimo para atrair um jogador renomado.`;
                  break;
              case 'TopPoachesLower':
                  specificInstruction = scenario.player.age < 24
                      ? `Destaque o jogador como uma 'jovem promessa' na mira de gigantes.`
                      : `Mencione que o jogador é o principal destaque do time atual e busca um novo desafio.`;
                  break;
              case 'IntraTier':
                  specificInstruction = `Trate como uma rivalidade ou transferência estratégica entre competidores diretos.`;
                  break;
          }

          return `
            - Rumor ${index + 1}:
              - Jogador: ${scenario.player.name}, ${scenario.player.age} anos, overall ${scenario.player.overall}.
              - Time Atual: ${scenario.sellingTeam.teamName}.
              - Time Interessado: ${scenario.buyingTeam.teamName}.
              - Estilo da notícia: ${specificInstruction}
          `;
      }).join('');

      return `Crie ${scenarios.length} rumores de transferência curtos e criativos em português. Para cada um, forneça um título chamativo e um parágrafo curto.
      
      Aqui estão os cenários:
      ${scenarioTexts}
      
      Instruções Gerais:
      - Seja direto e soe como um jornalista esportivo.
      - Retorne a resposta como um array de objetos JSON, cada um com as chaves "title" e "content".
      - Não use markdown ou backticks no JSON.
      `;
  }
  
  private _findTeamWithInterestingForm() {
    const leagues = this.universeService.leagues().filter(l => l.status === 'ongoing');
    if (leagues.length === 0) return null;

    const randomLeague = leagues[Math.floor(Math.random() * leagues.length)];
    const division = randomLeague.divisions[0];
    if (division.teams.length === 0) return null;
    
    const team = division.teams[Math.floor(Math.random() * division.teams.length)];
    const teamPosition = [...division.teams]
        .sort((a,b) => (b.stats?.points || 0) - (a.stats?.points || 0))
        .findIndex(t => t.id === team.id) + 1;

    const recentMatches = this.universeService.matchHistory()
        .filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id)
        .slice(0, 5)
        .map(m => {
            let result: 'V' | 'E' | 'D';
            let score: string;
            if (m.homeScore === m.awayScore) {
                result = 'E';
                score = `${m.homeScore}-${m.awayScore}`;
            } else if ((m.homeTeamId === team.id && m.homeScore > m.awayScore) || (m.awayTeamId === team.id && m.awayScore > m.homeScore)) {
                result = 'V';
                score = m.homeTeamId === team.id ? `${m.homeScore}-${m.awayScore}` : `${m.awayScore}-${m.homeScore}`;
            } else {
                result = 'D';
                 score = m.homeTeamId === team.id ? `${m.homeScore}-${m.awayScore}` : `${m.awayScore}-${m.homeScore}`;
            }
            return { result, score };
        });

    if (recentMatches.length < 3) return null;

    return {
        team,
        leagueName: randomLeague.countryName,
        position: teamPosition,
        recentMatches,
    };
  }

  private _findImportantUpcomingMatch(): { match: Match, competitionName: string, homeTeamPosition?: number, awayTeamPosition?: number } | null {
    const leagues = this.universeService.leagues().filter(l => l.status === 'ongoing');
    if (leagues.length === 0) return null;

    for (const league of leagues) {
        const division = league.divisions[0];
        if (division.teams.length < 4) continue;
        
        const sortedTeams = [...division.teams].sort((a,b) => (b.stats?.points || 0) - (a.stats?.points || 0));
        const topTeam = sortedTeams[0];
        const secondTeam = sortedTeams[1];

        const upcomingFixtures = division.fixtures[league.currentRound];
        if (upcomingFixtures) {
            const topClash = upcomingFixtures.find(m =>
                !m.played &&
                ((m.homeTeam.id === topTeam.id && m.awayTeam.id === secondTeam.id) ||
                (m.homeTeam.id === secondTeam.id && m.awayTeam.id === topTeam.id))
            );
            if (topClash) {
                return {
                    match: topClash,
                    competitionName: `${league.countryName} - ${division.name}`,
                    homeTeamPosition: 1,
                    awayTeamPosition: 2,
                };
            }
        }
    }
    
    const topLeagues = leagues.filter(l => (this.LEAGUE_TIERS.get(l.countryId) || 4) <= 2);
    const leagueToUse = topLeagues.length > 0 ? topLeagues[Math.floor(Math.random() * topLeagues.length)] : leagues[0];
    const division = leagueToUse.divisions[0];
    const upcomingFixtures = (division.fixtures[leagueToUse.currentRound] || []).filter(m => !m.played);
    if (upcomingFixtures && upcomingFixtures.length > 0) {
        const randomMatch = upcomingFixtures[Math.floor(Math.random() * upcomingFixtures.length)];
         const sortedTeams = [...division.teams].sort((a,b) => (b.stats?.points || 0) - (a.stats?.points || 0));
        return {
             match: randomMatch,
             competitionName: `${leagueToUse.countryName} - ${division.name}`,
             homeTeamPosition: sortedTeams.findIndex(t => t.id === randomMatch.homeTeam.id) + 1,
             awayTeamPosition: sortedTeams.findIndex(t => t.id === randomMatch.awayTeam.id) + 1,
        };
    }

    return null;
  }
}