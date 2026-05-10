import { Injectable } from '@angular/core';
import { Team, League } from '../models';

@Injectable({ providedIn: 'root' })
export class EvolutionService {

  /**
   * Processa a evolução completa do Universo ao final de uma temporada
   */
  evolveUniverse(teams: Team[], leagues: League[]) {
    console.log('🧬 Processando Evolução do Universo (Dynasty Engine)...');
    
    teams.forEach(team => {
      const oldOverall = team.overall;

      // 1. Inicializar campos se não existirem
      this.initializeTeamDNA(team);

      // 2. Cálculo de Performance vs Expectativa
      const performanceFactor = this.calculatePerformanceFactor(team, leagues);

      // 3. Aplicar Ciclo de Vida do Elenco com Sarrafo de Expectativa
      this.applySquadLifecycle(team, performanceFactor);

      // 4. Fator Caos (Cisnes Negros e Projetos Bilionários) - RECALIBRADO
      this.applyChaosAndProjects(team);

      // 5. Resistência de Elite (Diminishing Returns)
      // Quanto maior o overall, maior a "gravidade" puxando para baixo
      if (team.overall > 85) {
        const resistance = (team.overall - 85) * 0.15;
        team.overall -= (Math.random() * resistance);
      }

      // 6. Normalização Final
      team.overall = Math.round(Math.max(60, Math.min(95, team.overall)));
      
      // Calcular Variação
      team.overallVariation = team.overall - oldOverall;

      // Avançar passo do ciclo (1 a 8)
      team.cycleStep = (team.cycleStep || 1) >= 8 ? 1 : (team.cycleStep || 1) + 1;
    });

    console.log('✅ Evolução concluída.');
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

    // Encontrar posição do time nas divisões
    let position = 10;
    let totalTeams = 20;
    
    for (const div of league.divisions) {
      const idx = div.teams.findIndex(t => t.id === team.id);
      if (idx !== -1) {
        position = idx + 1;
        totalTeams = div.teams.length;
        break;
      }
    }

    // Fator de Performance: 1.0 (excelente) a -1.0 (péssimo)
    // Se o time ficar no topo (G4), fator positivo. Se ficar no fundo, fator negativo.
    const relativePos = position / totalTeams;
    if (relativePos <= 0.2) return 1.0; // Top 20%
    if (relativePos <= 0.4) return 0.5; // Top 40%
    if (relativePos >= 0.8) return -1.2; // Bottom 20% (Crise)
    if (relativePos >= 0.6) return -0.6; // Bottom 40%
    
    return 0; // Mediano
  }

  private applySquadLifecycle(team: Team, performanceFactor: number) {
    const step = team.cycleStep || 1;
    const isElite = team.overall >= 85;
    
    // O sarrafo é maior para times de elite
    const difficultyMultiplier = isElite ? 0.5 : 1.0;

    // Anos 1-2: Reconstrução
    if (step <= 2) {
      const baseGrowth = (Math.random() * 2) + 0.2;
      team.overall += (baseGrowth + (performanceFactor * 1.5)) * difficultyMultiplier;
    } 
    // Anos 3-6: Auge/Estabilidade
    else if (step <= 6) {
      team.overall += (Math.random() * 0.8) - 0.4 + (performanceFactor * 0.8);
    }
    // Anos 7-8: Declínio
    else {
      const decline = (Math.random() * 2) + 0.5;
      team.overall -= (decline - (performanceFactor * 0.5));
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
