import { Injectable } from '@angular/core';
import { Team, League } from '../models';

@Injectable({ providedIn: 'root' })
export class EvolutionService {

  private readonly CONTINENTAL_LIMITS: { [key: string]: number } = {
    'EUR': 95,
    'SAM': 85,
    'ASI': 85,
    'NCA': 80,
    'AFR': 78,
    'OCE': 75,
    'WORLD': 90
  };

  /**
   * Processa a evolução completa do Universo ao final de uma temporada
   */
  evolveUniverse(teams: Team[], leagues: League[]) {
    console.log('🧬 Processando Evolução do Universo (Equilibrium Engine)...');
    
    // Mapeamento rápido de Time -> Continente
    const teamToContinent = new Map<string, string>();
    teams.forEach(t => {
      const league = leagues.find(l => l.countryId === t.countryId);
      teamToContinent.set(t.id, league?.continent || 'EUR');
    });

    // 1. Identificar times da Elite Europeia (> 90)
    const eliteEurTeams = teams
      .filter(t => teamToContinent.get(t.id) === 'EUR' && t.overall >= 90)
      .sort((a, b) => b.overall - a.overall);

    let increased = 0;
    let decreased = 0;
    let stable = 0;
    
    teams.forEach(team => {
      const oldOverall = team.overall;
      const continent = teamToContinent.get(team.id) || 'EUR';
      const limit = this.CONTINENTAL_LIMITS[continent] || 85;

      // 1. Inicializar campos se não existirem
      this.initializeTeamDNA(team);

      // 2. Cálculo de Performance vs Expectativa
      const performanceFactor = this.calculatePerformanceFactor(team, leagues);

      // 3. Aplicar Ciclo de Vida do Elenco (Pode aumentar ou diminuir o overall)
      this.applySquadLifecycle(team, performanceFactor);

      // 4. Fator Caos (Cisnes Negros e Projetos Bilionários)
      this.applyChaosAndProjects(team);

      // 5. [EQUILIBRIUM] Resistência Continental (Dampening)
      // Em vez de diminuir o valor, vamos reduzir o GANHO se estiver perto do teto
      if (team.overall > oldOverall) {
        const gain = team.overall - oldOverall;
        let dampening = 1.0;

        // Gravidade natural do limite continental: quanto mais perto do teto, mais difícil subir
        if (team.overall > (limit - 10)) {
           // Fator de proximidade: 0 (longe do teto) a 1 (no teto ou acima)
           const proximity = Math.min(1, (team.overall - (limit - 10)) / 10);
           dampening = 1.0 - (proximity * 0.85); // No teto, só aproveita 15% do ganho
        }

        // Trava de Elite Europeia (Apenas 8 times acima de 90)
        if (continent === 'EUR' && team.overall > 90) {
          const rank = eliteEurTeams.findIndex(t => t.id === team.id);
          if (rank >= 8) { // Fora do top 8
             dampening *= 0.2; // Quase impossível crescer fora do G8 se já estiver em 90
          }
        }

        team.overall = oldOverall + (gain * dampening);
      }

      // 6. [IDEIA FODA] Efeito Êxodo (Fora da Europa) - 15% de chance
      if (continent !== 'EUR' && team.overall >= (limit - 2)) {
        if (Math.random() < 0.15) { // Reduzido para 15%
          const saleProfit = (team.overall - 70) * 10000000;
          team.budget += saleProfit;
          const loss = (Math.random() * 2) + 2; // Perde 2 a 4 de overall
          team.overall -= loss;
          console.warn(`✈️ [ÊXODO] ${team.teamName} (${continent}) vendeu suas estrelas para a Europa! Budget +$${(saleProfit/1000000).toFixed(0)}M | Overall -${loss.toFixed(1)}`);
        }
      }

      // 7. Normalização Final (Hard Limit absoluto)
      team.overall = Math.round(Math.max(60, Math.min(limit, team.overall)));
      
      // Calcular Variação Final
      team.overallVariation = team.overall - oldOverall;
      if (team.overallVariation > 0) increased++;
      else if (team.overallVariation < 0) decreased++;
      else stable++;

      if (team.overallVariation !== 0) {
        if (Math.abs(team.overallVariation) >= 2 || team.overall > 88) {
          console.log(`📈 [EVOLUÇÃO] ${team.teamName} (${continent}): ${oldOverall} -> ${team.overall} (${team.overallVariation > 0 ? '+' : ''}${team.overallVariation.toFixed(1)})`);
        }
      }

      // Avançar passo do ciclo (1 a 8)
      team.cycleStep = (team.cycleStep || 1) >= 8 ? 1 : (team.cycleStep || 1) + 1;
    });

    console.log(`✅ Evolução concluída: ${increased} subiram, ${decreased} caíram, ${stable} estáveis.`);
  }

  private initializeTeamDNA(team: Team) {
    if (!team.cycleStep) team.cycleStep = Math.floor(Math.random() * 8) + 1;
    if (!team.volatility) team.volatility = Math.random() * 0.3 + 0.05; // Volatilidade reduzida
    if (!team.momentum) team.momentum = 0;
    
    if (!team.tier) {
      if (team.overall >= 88) team.tier = 'WORLD_CLASS';
      else if (team.overall >= 83) team.tier = 'ELITE';
      else if (team.overall >= 74) team.tier = 'PROFESSIONAL';
      else team.tier = 'DEVELOPING';
    }
  }

  private calculatePerformanceFactor(team: Team, leagues: League[]): number {
    const league = leagues.find(l => l.countryId === team.countryId);
    if (!league) return 0;

    // Encontrar posição do time nas divisões (ORDENADA POR PONTOS)
    let position = 10;
    let totalTeams = 20;
    
    for (const div of league.divisions) {
      const idx = div.teams.findIndex(t => t.id === team.id);
      if (idx !== -1) {
        // Precisamos saber a posição real na tabela
        const sortedTeams = [...div.teams].sort((a, b) => {
          const ptsA = a.stats?.points ?? 0;
          const ptsB = b.stats?.points ?? 0;
          if (ptsA !== ptsB) return ptsB - ptsA;
          
          const gdA = (a.stats?.goalsFor ?? 0) - (a.stats?.goalsAgainst ?? 0);
          const gdB = (b.stats?.goalsFor ?? 0) - (b.stats?.goalsAgainst ?? 0);
          if (gdA !== gdB) return gdB - gdA;
          
          return (b.stats?.goalsFor ?? 0) - (a.stats?.goalsFor ?? 0);
        });
        
        position = sortedTeams.findIndex(t => t.id === team.id) + 1;
        totalTeams = div.teams.length;
        break;
      }
    }

    // Fator de Performance: 1.0 (excelente) a -1.0 (péssimo)
    const relativePos = position / totalTeams;
    if (relativePos <= 0.2) return 1.0; // Top 20% (Campeão/G4)
    if (relativePos <= 0.4) return 0.5; // Top 40% (Vagas Internacionais)
    if (relativePos >= 0.8) return -1.5; // Bottom 20% (Zona de Rebaixamento/Crise)
    if (relativePos >= 0.6) return -0.8; // Bottom 40% (Luta contra o Z4)
    
    return 0; // Meio de tabela
  }

  private applySquadLifecycle(team: Team, performanceFactor: number) {
    const step = team.cycleStep || 1;
    const isElite = team.overall >= 85;
    
    // O sarrafo é maior para times de elite (mais difícil subir, mais fácil cair)
    const difficultyMultiplier = isElite ? 0.6 : 1.0;

    // Anos 1-2: Reconstrução / Subida
    if (step <= 2) {
      const baseGrowth = (Math.random() * 2.5) + 0.5; // Crescimento base garantido
      team.overall += (baseGrowth + (performanceFactor * 2)) * difficultyMultiplier;
    } 
    // Anos 3-6: Auge / Estabilidade
    else if (step <= 6) {
      // Ampliado para +-1.2 para que o arredondamento permita mudanças de 1 ponto
      const stabilityVar = (Math.random() * 2.4) - 1.2; 
      team.overall += stabilityVar + (performanceFactor * 1.0);
    }
    // Anos 7-8: Envelhecimento / Declínio
    else {
      const decline = (Math.random() * 2.5) + 1.0;
      team.overall -= (decline - (performanceFactor * 0.8));
    }
  }

  private applyChaosAndProjects(team: Team) {
    const roll = Math.random() * 1000;

    // EVENTO: Cisne Negro (Colapso) - 0.3% de chance
    if (roll > 997 && team.overall > 80) {
      console.warn(`🚨 COLAPSO: ${team.teamName} entrou em crise institucional!`);
      team.overall -= (Math.random() * 5) + 5; // Perda de 5 a 10 pontos (mais realista)
      team.tier = 'FALLEN_GIANT';
    }

    // EVENTO: O Projeto (Novo Investimento) - 0.4% de chance
    // Nerfado para não criar super-times instantâneos
    if (roll < 4 && team.overall < 85) {
      console.log(`💰 INVESTIMENTO: ${team.teamName} recebeu um aporte financeiro!`);
      team.overall += (Math.random() * 3) + 4; // Ganho de 4 a 7 pontos
      if (team.overall > 83) team.tier = 'ELITE';
    }
  }
}
