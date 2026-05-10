import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Match } from '../../models';

import { UniverseService } from '../../services/universe.service';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarViewComponent {
  universeService = inject(UniverseService);
  allFixtures = input.required<Match[][]>();
  totalRounds = input.required<number>();
  divisionName = input.required<string | undefined>();
  currentRound = input.required<number>();
  viewMatchDetails = output<Match>();

  selectedRound = signal(0);
  
  constructor() {
    effect(() => {
      this.selectedRound.set(this.currentRound());
    });
  }
  
  rounds = computed(() => Array.from({ length: this.totalRounds() }, (_, i) => i));

  selectedRoundFixtures = computed(() => this.allFixtures()[this.selectedRound()] ?? []);

  selectRound(roundIndex: number): void {
    this.selectedRound.set(roundIndex);
  }

  openMatchDetails(match: Match): void {
    if (match.played) {
      this.viewMatchDetails.emit(match);
    }
  }
}
