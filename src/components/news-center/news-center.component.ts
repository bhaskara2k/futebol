import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniverseService } from '../../services/universe.service';
import { NewsService } from '../../services/news.service';
import { NATIONALITIES } from '../../nationalities.data';

@Component({
  selector: 'app-news-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-center.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCenterComponent implements OnInit {
  universeService = inject(UniverseService);
  newsService = inject(NewsService);

  private nationalityMap = new Map<string, string>(
    NATIONALITIES.map(n => [n.code3, n.code2])
  );

  articles = this.newsService.news;

  categoryLabels: Record<string, string> = {
    'transfers': 'Mercado',
    'results': 'Resultados',
    'form': 'Classificação',
    'previews': 'Prévia',
    'awards': 'Premiação',
    'rumors': 'Rumores',
    'legacy': 'Geral'
  };

  private categoryImages: Record<string, string> = {
    'transfers': 'https://images.unsplash.com/photo-1520110120185-21786e247f16?q=80&w=1000&auto=format&fit=crop',
    'rumors': 'https://images.unsplash.com/photo-1551854838-212c20b8c01d?q=80&w=1000&auto=format&fit=crop',
    'results': 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=1000&auto=format&fit=crop',
    'awards': 'https://images.unsplash.com/photo-1578267139713-267bf0f3ec1e?q=80&w=1000&auto=format&fit=crop',
    'form': 'https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=1000&auto=format&fit=crop',
    'legacy': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop'
  };

  ngOnInit(): void {
    // Generate fresh news when entering the component
    this.newsService.generateNewsCycle();
  }

  refreshNews(): void {
    this.newsService.generateNewsCycle();
  }

  getCategoryLabel(cat: string): string {
    return this.categoryLabels[cat] || cat;
  }

  getArticleImage(article: any): string {
    // Priority 1 (Hero) gets a specific high-quality action shot
    if (article.priority === 1 && article.category !== 'rumors') {
      return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop';
    }
    return this.categoryImages[article.category] || this.categoryImages['legacy'];
  }

  getFlagUrl(countryId: string): string {
    if (!countryId) return '';
    const code2 = this.nationalityMap.get(countryId) || 'un';
    return `https://flagcdn.com/w40/${code2.toLowerCase()}.png`;
  }
}
