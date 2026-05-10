import { Component, input, output, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
// Fix: Imported H2HData from models.ts where it is properly exported.
import { Match, HistoricMatch, H2HData } from '../../models';
import { UniverseService } from '../../services/universe.service';

@Component({
    selector: 'app-match-details-modal',
    imports: [CommonModule],
    templateUrl: './round-summary-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(window:keydown.escape)': 'onClose()',
    },
})
export class MatchDetailsModalComponent {
    data = input.required<{ match: Match; h2h: H2HData }>();
    closeModal = output<void>();

    public universeService = inject(UniverseService);

    match = computed(() => this.data().match);
    h2h = computed(() => this.data().h2h);

    onClose(): void {
        this.closeModal.emit();
    }

    tryPngFallback(event: any): void {
        const img = event.target as HTMLImageElement;
        if (img.src.includes('.svg')) {
            img.src = img.src.replace('.svg', '.png');
        } else {
            img.style.display = 'none';
        }
    }

    getTeamCrest(teamName: string): string {
        const team = this.universeService.teams().find(t => t.teamName === teamName);
        if (team) return this.universeService.getTeamCrest(team);
        
        // Fallback se não achar o objeto time completo (gera slug do nome)
        const slug = teamName.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return `/assets/crests/${slug}.svg`;
    }
}