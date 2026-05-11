import { Injectable } from '@angular/core';
import { Team, League } from '../models';

@Injectable({ providedIn: 'root' })
export class EvolutionService {

  /**
   * Processa a evolução completa do Universo ao final de uma temporada
   */
  evolveUniverse(teams: Team[], leagues: League[]) {
    console.log('🧬 Processando Evolução do Universo (Dynasty Engine)...');
    let increased = 0;
    let decreased = 0;
    let stable = 0;
    
    teams.forEach(team => {
      const oldOverall = team.overall;

      // 1. Inicializar campos se não existirem
      this.initializeTeamDNA(team);

      // 2. Cálculo de Performance vs Expectativa
      const performanceFactor = this.calculatePerformanceFactor(team, leagues);

      // 3. Aplicar Ciclo de Vida do Elenco
      this.applySquadLifecycle(team, performanceFactor);

      // 4. Fator Caos (Cisnes Negros e Projetos Bilionários)
      this.applyChaosAndProjects(team);

      // 5. Resistência de Elite
      if (team.overall > 85) {
        const resistance = (team.overall - 85) * 0.15;
        team.overall -= (Math.random() * resistance);
      }

      // 6. Normalização Final
      team.overall = Math.round(Math.max(60, Math.min(95, team.overall)));
      
      // Calcular Variação
      team.overallVariation = team.overall - oldOverall;
      if (team.overallVariation > 0) increased++;
      else if (team.overallVariation < 0) decreased++;
      else stable++;

      if (team.overallVariation !== 0) {
        console.log(`📈 [EVOLUÇÃO] ${team.teamName}: ${oldOverall} -> ${team.overall} (${team.overallVariation > 0 ? '+' : ''}${team.overallVariation})`);
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
