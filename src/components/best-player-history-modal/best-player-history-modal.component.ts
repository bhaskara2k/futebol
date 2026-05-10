import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BestPlayerAwardRecord } from '../../models';
import { OverallColorPipe } from '../../pipes/overall-color.pipe';

@Component({
  selector: 'app-best-player-history-modal',
  imports: [CommonModule, OverallColorPipe],
  templateUrl: './best-player-history-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BestPlayerHistoryModalComponent {
  history = input.required<BestPlayerAwardRecord[]>();
  closeModal = output<void>();

  onClose(): void {
    this.closeModal.emit();
  }
}
