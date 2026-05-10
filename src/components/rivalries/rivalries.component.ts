import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniverseService } from '../../services/universe.service';
import { Team, H2HData, Trophy } from '../../models';

interface Rivalry {
  name: string;
  teamA: string;
  teamB: string;
}

interface RivalryDetails {
  teamA: Team;
  teamB: Team;
  h2h: H2HData;
  trophies: {
    teamA: number;
    teamB: number;
  };
}

@Component({
  selector: 'app-rivalries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rivalries.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RivalriesComponent {
  public universeService = inject(UniverseService);

  // Lista de rivalidades agora é um signal mutável
  rivalries = signal<Rivalry[]>([
    { name: 'El Clásico', teamA: 'REAL MADRID CF', teamB: 'FC BARCELONA' },
    { name: 'Manchester Derby', teamA: 'MANCHESTER CITY', teamB: 'MANCHESTER UNITED' },
    { name: 'Derby della Madonnina', teamA: 'AC MILAN', teamB: 'INTER MILAN' },
    { name: 'Der Klassiker', teamA: 'BAYERN MUNICH', teamB: 'BORUSSIA DORTMUND' },
    { name: 'Le Classique', teamA: 'PARIS SAINT-GERMAIN', teamB: 'OLYMPIQUE DE MARSEILLE' },
    { name: 'Superclásico', teamA: 'BOCA JUNIORS', teamB: 'RIVER PLATE' },
    { name: 'Derby Paulista', teamA: 'PALMEIRAS', teamB: 'CORINTHIANS' },
    { name: 'Gre-Nal', teamA: 'GRÊMIO', teamB: 'INTERNACIONAL' },
    { name: 'Fla-Flu', teamA: 'FLAMENGO', teamB: 'FLUMINENSE' },
    { name: 'North London Derby', teamA: 'ARSENAL', teamB: 'TOTTENHAM HOTSPUR' },
    { name: 'Northwest Derby', teamA: 'LIVERPOOL FC', teamB: 'MANCHESTER UNITED' },
    { name: 'O Clássico', teamA: 'FC PORTO', teamB: 'SL BENFICA' },
    { name: 'Dérbi de Lisboa', teamA: 'SPORTING CP', teamB: 'SL BENFICA' },
    { name: 'Derbi Madrileno', teamA: 'REAL MADRID CF', teamB: 'ATLÉTICO DE MADRID' },
    { name: 'El Tráfico', teamA: 'LA GALAXY', teamB: 'LAFC' }
  ]);

  selectedRivalry = signal<Rivalry | null>(null);
  rivalryDetails = signal<RivalryDetails | null>(null);

  // Estado para criação
  isCreating = signal(false);
  newRivalryName = signal('');
  newRivalryTeamAId = signal('');
  newRivalryTeamBId = signal('');

  // Times disponíveis ordenados por nome para o dropdown
  sortedTeams = computed(() => {
    return [...this.universeService.teams()].sort((a, b) => a.teamName.localeCompare(b.teamName));
  });

  selectRivalry(rivalry: Rivalry): void {
    const allTeams = this.universeService.teams();
    const teamA = allTeams.find(t => t.teamName === rivalry.teamA);
    const teamB = allTeams.find(t => t.teamName === rivalry.teamB);

    if (teamA && teamB) {
      const h2h = this.universeService.getHeadToHead(teamA.id, teamB.id);
      const trophiesA = (teamA.trophies || []).reduce((sum, t) => sum + t.count, 0);
      const trophiesB = (teamB.trophies || []).reduce((sum, t) => sum + t.count, 0);

      this.rivalryDetails.set({
        teamA,
        teamB,
        h2h,
        trophies: { teamA: trophiesA, teamB: trophiesB }
      });
      this.selectedRivalry.set(rivalry);
    }
  }

  saveNewRivalry() {
    const name = this.newRivalryName();
    const tAId = this.newRivalryTeamAId();
    const tBId = this.newRivalryTeamBId();

    if (!name || !tAId || !tBId || tAId === tBId) return;

    const allTeams = this.universeService.teams();
    const teamA = allTeams.find(t => t.id === tAId);
    const teamB = allTeams.find(t => t.id === tBId);

    if (teamA && teamB) {
      this.rivalries.update(list => [
        ...list,
        { name, teamA: teamA.teamName, teamB: teamB.teamName }
      ]);
      this.resetForm();
    }
  }

  resetForm() {
    this.isCreating.set(false);
    this.newRivalryName.set('');
    this.newRivalryTeamAId.set('');
    this.newRivalryTeamBId.set('');
  }

  toggleCreate() {
    this.isCreating.update(v => !v);
  }

  goBackToSelection(): void {
    this.selectedRivalry.set(null);
    this.rivalryDetails.set(null);
  }

  getTrophyCount(team: Team, type: Trophy['type']): number {
    if (!team.trophies) return 0;
    return team.trophies.filter(t => t.type === type).reduce((sum, t) => sum + t.count, 0);
  }

  // Helper para gerar iniciais para o avatar
  getInitials(teamName: string): string {
    return teamName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 3)
      .toUpperCase();
  }

  // Helper para verificar se o time tem logo
  hasLogo(teamName: string): boolean {
    const team = this.universeService.teams().find(t => t.teamName === teamName);
    return !!(team && this.universeService.getTeamCrest(team));
  }

  // Helper para obter a URL do logo
  getLogoUrl(teamName: string): string {
    const team = this.universeService.teams().find(t => t.teamName === teamName);
    if (!team) return '';
    return this.universeService.getTeamCrest(team);
  }
}