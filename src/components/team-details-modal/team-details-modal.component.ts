import { Component, ChangeDetectionStrategy, input, output, EventEmitter, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Team, Trophy, Player, H2HData } from '../../models';
import { CurrencyShortPipe } from '../../pipes/currency-short.pipe';
import { UniverseService } from '../../services/universe.service';
import { NATIONALITIES } from '../../nationalities.data';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';

interface Competition {
  name: string;
  type: 'national_league' | 'national_cup' | 'international' | 'world' | 'lower_division';
  country?: string;
  continent?: 'EUR' | 'AFR' | 'ASI' | 'NCA' | 'SAM';
}

@Component({
  selector: 'app-team-details-modal',
  imports: [CommonModule, ReactiveFormsModule, CurrencyShortPipe, OverallColorPipe],
  templateUrl: './team-details-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.escape)': 'onClose()',
  },
})
export class TeamDetailsModalComponent implements OnInit {
  team = input.required<Team>();
  closeModal = output<void>();
  saveTeamDetails = output<Team>();
  viewPlayerDetails = output<{ player: Player, team: Team }>();
  promotePlayer = output<{ player: Player; teamId: string }>();
  releasePlayer = output<{ player: Player; teamId: string }>();

  private fb: FormBuilder = inject(FormBuilder);
  universeService = inject(UniverseService);

  activeTab = signal<'finances' | 'trophies'>('finances');
  trophyViewMode = signal<'gallery' | 'edit'>('gallery');
  teamForm!: FormGroup;

  trophies = signal<Trophy[]>([]);
  budgetFromTrophies = signal<number>(0);

  allCompetitions = computed(() => {
    const potential = [...this.nationalCompetitions(), ...this.internationalCompetitions()];
    const won = this.trophies();
    
    // Adicionar troféus que o time já ganhou mas que não estão na lista de potenciais
    const extra: Competition[] = [];
    won.forEach(w => {
      if (!potential.some(p => p.name === w.name)) {
        extra.push({
          name: w.name,
          type: w.type as any
        });
      }
    });

    return [...potential, ...extra];
  });

  private nationalityMap = new Map<string, string>(NATIONALITIES.map(n => [n.code3, n.code2]));
  private failedLogos = new Set<string>(); // Track logos that failed to load

  allTeams = computed(() => {
    const currentTeam = this.team();
    return this.universeService.teams()
      .filter(t => t.id !== currentTeam.id && t.countryId === currentTeam.countryId)
      .sort((a, b) => a.teamName.localeCompare(b.teamName))
  });

  selectedRivalId = signal<string | null>(null);

  rivalTeam = computed(() => {
    const rivalId = this.selectedRivalId();
    if (!rivalId) return null;
    return this.allTeams().find(t => t.id === rivalId);
  });

  rivalH2h = computed(() => {
    const rival = this.rivalTeam();
    if (!rival) return null;
    return this.universeService.getHeadToHead(this.team().id, rival.id);
  });


  private static readonly UNSORTED_COMPETITIONS: Competition[] = [
    { name: 'Liga Nacional', type: 'national_league' },
    { name: 'Copa Nacional', type: 'national_cup' },
    { name: 'Copa da Liga (Inglaterra)', type: 'national_cup', country: 'ENG' },
    { name: 'Champions League', type: 'international', continent: 'EUR' },
    { name: 'Europa League', type: 'international', continent: 'EUR' },
    { name: 'Euro League', type: 'international', continent: 'EUR' },
    { name: 'Supercopa', type: 'international', continent: 'EUR' },
    { name: 'África Champions League', type: 'international', continent: 'AFR' },
    { name: 'Ásia Champions League', type: 'international', continent: 'ASI' },
    { name: 'America Champions League', type: 'international', continent: 'NCA' },
    { name: 'Copa Libertadores', type: 'international', continent: 'SAM' },
    { name: 'Copa Sulamericana', type: 'international', continent: 'SAM' },
    { name: 'Recopa', type: 'international', continent: 'SAM' },
    { name: 'Mundial de Clubes', type: 'world' }
  ];

  readonly competitions: Competition[] = [...TeamDetailsModalComponent.UNSORTED_COMPETITIONS].sort((a, b) => a.name.localeCompare(b.name));

  private readonly budgetRewards = {
    national_league: 30_000_000,
    national_cup: 20_000_000,
    international: 40_000_000,
    world: 50_000_000,
    lower_division: 0,
  };



  nationalCompetitions = computed(() => {
    const teamCountry = this.team().countryId;
    const league = this.universeService.leagues().find(l => l.countryId === teamCountry);
    const comps: Competition[] = [];

    if (league) {
      // Adicionar todas as divisões do país do time
      league.divisions.forEach((div, index) => {
        comps.push({
          name: div.name,
          type: index === 0 ? 'national_league' : 'lower_division'
        });
      });

      // Adicionar Copas
      if (league.cup) comps.push({ name: 'Copa Nacional', type: 'national_cup' });
      if (league.leagueCup) comps.push({ name: 'Copa da Liga', type: 'national_cup' });
      if (league.supercup) comps.push({ name: 'Supercopa Nacional', type: 'national_cup' });
    } else {
      // Fallback caso não encontre a liga
      comps.push({ name: 'Liga Nacional', type: 'national_league' });
      comps.push({ name: 'Copa Nacional', type: 'national_cup' });
    }

    return comps;
  });

  internationalCompetitions = computed(() => {
    const teamCountry = this.team().countryId;
    const teamContinent = this.universeService.getContinentForLeague(teamCountry);
    return this.competitions.filter(c =>
      c.type === 'world' ||
      (c.type === 'international' && (!c.continent || c.continent === teamContinent))
    );
  });



  ngOnInit(): void {
    const currentTeam = this.team();
    this.teamForm = this.fb.group({
      teamName: [currentTeam.teamName, Validators.required],
      logoUrl: [currentTeam.logoUrl || ''],
      overall: [currentTeam.overall, [Validators.required, Validators.min(0), Validators.max(99)]],
      rivalId: [currentTeam.rivalId || '']
    });

    this.trophies.set(currentTeam.trophies || []);

    this.teamForm.get('rivalId')?.valueChanges.subscribe(value => {
      this.selectedRivalId.set(value || null);
    });
    this.selectedRivalId.set(this.teamForm.get('rivalId')?.value || null);
  }

  getTrophyCount(competitionName: string): number {
    return this.trophies().find(t => t.name === competitionName)?.count || 0;
  }

  incrementTrophy(competition: Competition): void {
    this.trophies.update(currentTrophies => {
      const existingTrophy = currentTrophies.find(t => t.name === competition.name);
      if (existingTrophy) {
        return currentTrophies.map(t =>
          t.name === competition.name ? { ...t, count: t.count + 1 } : t
        );
      } else {
        return [...currentTrophies, { name: competition.name, count: 1, type: competition.type }];
      }
    });
    this.budgetFromTrophies.update(b => b + (this.budgetRewards[competition.type] || 0));
  }

  decrementTrophy(competition: Competition): void {
    const existingTrophy = this.trophies().find(t => t.name === competition.name);
    if (!existingTrophy || existingTrophy.count === 0) return;

    this.trophies.update(currentTrophies => {
      if (existingTrophy.count > 1) {
        return currentTrophies.map(t =>
          t.name === competition.name ? { ...t, count: t.count - 1 } : t
        );
      } else {
        return currentTrophies.filter(t => t.name !== competition.name);
      }
    });
    this.budgetFromTrophies.update(b => b - (this.budgetRewards[competition.type] || 0));
  }

  getTrophyStyle(compName: string): { bg: string, icon: string, glow: string } {
    const name = compName.toUpperCase();
    if (name.includes('MUNDIAL') || name.includes('WORLD')) {
      return { 
        bg: 'from-yellow-400 via-amber-500 to-yellow-700', 
        icon: 'text-yellow-100',
        glow: 'shadow-yellow-500/50'
      };
    }
    if (name.includes('CHAMPIONS') || name.includes('LIBERTADORES') || name.includes('CONTINENTAL')) {
      return { 
        bg: 'from-blue-400 via-indigo-500 to-blue-700', 
        icon: 'text-blue-100',
        glow: 'shadow-blue-500/50'
      };
    }
    if (name.includes('LIGA') || name.includes('SÉRIE A') || name.includes('PREMIER') || name.includes('BUDESLIGA')) {
      return { 
        bg: 'from-emerald-400 via-teal-500 to-emerald-700', 
        icon: 'text-emerald-100',
        glow: 'shadow-emerald-500/50'
      };
    }
    return { 
      bg: 'from-gray-400 via-gray-500 to-gray-700', 
      icon: 'text-gray-100',
      glow: 'shadow-gray-500/50'
    };
  }

  onSave(): void {
    if (this.teamForm.invalid) return;

    const formValues = this.teamForm.value;
    const totalBudget = formValues.budget + this.budgetFromTrophies();

    const updatedTeam: Team = {
      ...this.team(),
      teamName: formValues.teamName,
      logoUrl: formValues.logoUrl,
      overall: formValues.overall,
      trophies: this.trophies(),
      rivalId: formValues.rivalId || undefined,
    };

    this.saveTeamDetails.emit(updatedTeam);
  }

  onPlayerClick(player: Player): void {
    this.viewPlayerDetails.emit({ player, team: this.team() });
  }

  getFlagUrl(nationalityId: string): string | null {
    const code2 = this.nationalityMap.get(nationalityId?.toUpperCase());
    if (code2) {
      return `https://flagcdn.com/w20/${code2.toLowerCase()}.png`;
    }
    return null;
  }

  getTeamLogoUrl(teamId: string): string {
    return `/assets/logos/${teamId}.png`;
  }

  onLogoError(teamId: string, event: Event): void {
    // Mark this logo as failed and hide the image
    this.failedLogos.add(teamId);
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  shouldShowLogo(teamId: string): boolean {
    return !this.failedLogos.has(teamId);
  }



  isGoalkeeper(player: Player): boolean {
    return player.isGoalkeeper;
  }

  isYouthGoalkeeper(player: Player): boolean {
    return player.isGoalkeeper;
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onPromotePlayer(player: Player): void {
    this.promotePlayer.emit({ player, teamId: this.team().id });
  }

  onReleasePlayer(player: Player): void {
    this.releasePlayer.emit({ player, teamId: this.team().id });
  }
  tryPngFallback(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.src.includes('.svg')) {
      img.src = img.src.replace('.svg', '.png');
    } else {
      img.style.display = 'none';
    }
  }
}
