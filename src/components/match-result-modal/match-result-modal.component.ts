import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MatchResultData {
  homeTeam: { name: string; id: string; logoUrl?: string };
  awayTeam: { name: string; id: string; logoUrl?: string };
  homeScore: number;
  awayScore: number;
  leg?: number;
  callback: (h: number, a: number) => void;
}

@Component({
  selector: 'app-match-result-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './match-result-modal.component.html'
})
export class MatchResultModalComponent {
  data = input.required<MatchResultData>();
  close = output<void>();

  homeScore = signal<number>(0);
  awayScore = signal<number>(0);

  ngOnInit() {
    this.homeScore.set(this.data().homeScore || 0);
    this.awayScore.set(this.data().awayScore || 0);
  }

  onSave() {
    this.data().callback(this.homeScore(), this.awayScore());
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }
}
