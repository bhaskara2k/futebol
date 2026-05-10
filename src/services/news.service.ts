import { Injectable, inject, signal, computed } from '@angular/core';
import { UniverseService } from './universe.service';
import { Team, Player, Match, TransferRecord, HistoricMatch } from '../models';

export type NewsCategory = 'transfers' | 'results' | 'form' | 'previews' | 'awards' | 'rumors' | 'legacy';

export interface NewsArticle {
    id: string;
    category: NewsCategory;
    title: string;
    subtitle: string;
    content: string;
    imageTag?: string; // Used to determine which decorative icon/color to show
    date: string;
    priority: number; // 1: Hero, 2: Featured, 3: Normal
    relevantTeamNames?: string[];
    playerContext?: {
        name: string;
        ovr: number;
        age: number;
        nationality: string;
        sourceTeam: string;
        targetTeam: string;
    };
}

@Injectable({ providedIn: 'root' })
export class NewsService {
    private universeService = inject(UniverseService);

    private readonly LEAGUE_TIERS = new Map<string, number>([
        ['ESP', 1], ['ENG', 1], ['ITA', 1], ['GER', 1], ['FRA', 1], ['BRA', 1],
        ['POR', 2], ['NED', 2], ['RUS', 2], ['ARG', 2], ['USA', 2], ['MEX', 2], ['SAU', 2],
        ['TUR', 3], ['BEL', 3], ['SUI', 3], ['GRE', 3], ['UKR', 3], ['AUT', 3], ['SAU', 3], ['QAT', 3],
    ]);

    private newsSignal = signal<NewsArticle[]>([]);
    public news = this.newsSignal.asReadonly();

    public activeCategory = signal<NewsCategory | 'all'>('all');

    public filteredNews = computed(() => {
        const category = this.activeCategory();
        const allNews = this.newsSignal();
        if (category === 'all') {
            // Home tab: Everything EXCEPT rumors
            return allNews.filter(n => n.category !== 'rumors');
        }
        return allNews.filter(n => n.category === category);
    });

    public generateNewsCycle(): void {
        let newArticles: NewsArticle[] = [];

        // 1. Stories & Milestones (Home Focus)
        newArticles.push(...this._generateGeneralNews());
        newArticles.push(...this._generateMatchStoryNews()); // High-level narratives
        newArticles.push(...this._generateMatchNews());      // Scorelines
        newArticles.push(...this._generateFormNews());       // Standings & Runs
        newArticles.push(...this._generateAwardNews());

        // 2. Market (Transfers & Rumors)
        newArticles.push(...this._generateTransferNews());
        newArticles.push(...this._generateRumorNews());

        // Fallback: Se ainda tiver menos de 10 artigos, gerar notícias "fillers" de bastidores
        if (newArticles.length < 10) {
            newArticles.push(...this._generateFillerNews(10 - newArticles.length));
        }

        // Increase capacity to 50 articles
        const sorted = newArticles.sort((a, b) => a.priority - b.priority);
        this.newsSignal.set(sorted.slice(0, 50));
    }

    private _generateFillerNews(count: number): NewsArticle[] {
        const fillers: NewsArticle[] = [];
        const templates = [
            { t: 'Preparação Física em Foco', s: 'Clubes intensificam treinos de pré-temporada.', c: 'Com o calendário apertado, as comissões técnicas focam na recuperação dos atletas.' },
            { t: 'Nova Tecnologia de Bolas', s: 'Federação anuncia novidades para as competições.', c: 'Os novos equipamentos prometem mais velocidade e precisão nos chutes de longa distância.' },
            { t: 'Bastidores do Mercado', s: 'Agentes de jogadores se reúnem em congresso global.', c: 'O encontro visa discutir novas regras de transferências e comissões para a próxima temporada.' }
        ];

        for (let i = 0; i < count; i++) {
            const tmp = templates[i % templates.length];
            fillers.push({
                id: `filler-${i}-${Date.now()}-${Math.random()}`,
                category: 'legacy',
                title: tmp.t,
                subtitle: tmp.s,
                content: tmp.c,
                imageTag: 'futebol',
                date: 'Outros',
                priority: 3
            });
        }
        return fillers;
    }

    private _generateGeneralNews(): NewsArticle[] {
        const season = this.universeService.season();
        return [{
            id: `welcome-${season}-${Math.random()}`,
            category: 'legacy',
            title: `TEMPORADA ${season} INICIADA!`,
            subtitle: `O mundo do futsal volta suas atenções para as quadras globais.`,
            content: `A bola já está rolando em diversos continentes. Com novos elencos e patrocínios renovados, a expectativa é de recordes de público e um nível técnico sem precedentes. Quem levantará o caneco da elite este ano?`,
            imageTag: 'futebol',
            date: 'Geral',
            priority: 3
        }];
    }

    private readonly SAM_COUNTRIES = ['BRA', 'ARG', 'URU', 'COL', 'CHL', 'PAR', 'BOL', 'PER', 'VEN', 'EQU'];

    private _generateRumorNews(): NewsArticle[] {
        const articles: NewsArticle[] = [];
        const allTeams = this.universeService.teams().filter(t => t.players.length > 0);
        if (allTeams.length < 5) return [];

        for (let i = 0; i < 50; i++) {
            if (articles.length >= 25) break;

            const sourceTeam = allTeams[Math.floor(Math.random() * allTeams.length)];
            const player = sourceTeam.players[Math.floor(Math.random() * sourceTeam.players.length)];
            if (!player) continue;

            const playerTier = this.LEAGUE_TIERS.get(sourceTeam.countryId) || 4;

            const potentialBuyers = allTeams.filter(t => {
                if (t.id === sourceTeam.id) return false;
                const buyerTier = this.LEAGUE_TIERS.get(t.countryId) || 4;

                const isSAMBuyer = this.SAM_COUNTRIES.includes(t.countryId);
                if (isSAMBuyer) {
                    const isSAMPlayer = this.SAM_COUNTRIES.includes(player.nationalityId);
                    const isVeteranStar = player.overall >= 84 && player.age >= 30;
                    const isFromAltMarket = ['SAU', 'QAT', 'USA', 'MEX', 'CHN', 'RUS', 'TUR'].includes(sourceTeam.countryId) && player.overall >= 82;

                    if (!isSAMPlayer && !isVeteranStar && !isFromAltMarket) return false;
                }

                if (buyerTier === 1 && player.overall >= 78) return true;
                if (['USA', 'SAU', 'QAT'].includes(t.countryId) && player.overall >= 80) return true;
                if (buyerTier === playerTier && player.overall >= 70) return true;
                if (buyerTier < playerTier && player.overall >= 68) return true;

                return false;
            });

            if (potentialBuyers.length === 0) continue;
            const buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];

            const isSAMBuyer = this.SAM_COUNTRIES.includes(buyer.countryId);
            const isVeteranReturn = isSAMBuyer && player.overall >= 84 && player.age >= 30;

            const rumorTemplates = [
                {
                    title: isVeteranReturn ? `RETORNO ÀS ORIGENS: ${player.name} no ${buyer.teamName}?` : `RADAR: ${buyer.teamName} monitora ${player.name}`,
                    subtitle: isVeteranReturn ? `O consagrado craque de ${player.age} anos pode estar de volta à América do Sul.` : `O clube estaria disposto a oferecer um projeto ambicioso pelo atleta do ${sourceTeam.teamName}.`,
                    content: isVeteranReturn ?
                        `A torcida do ${buyer.teamName} sonha alto. ${player.name}, ídolo global, é alvo de uma tentativa ousada para reforçar o elenco nesta temporada. O fator casa pode ser decisivo.` :
                        `Rumores de bastidores indicam que o interesse do ${buyer.teamName} em ${player.name} é real. O jogador de ${player.age} anos tem sido observado e uma proposta oficial pode chegar em breve.`
                },
                {
                    title: `PROPOSTA À VISTA: ${player.name} no ${buyer.teamName}?`,
                    subtitle: `Representantes do clube comprador iniciaram sondagens preliminares.`,
                    content: `A ascensão de ${player.name} no ${sourceTeam.teamName} não passou despercebida. O ${buyer.teamName} busca reforçar seu elenco e vê no atleta a peça que falta para o esquema do treinador.`
                },
                {
                    title: `MERCADO: ${buyer.teamName} entra na briga por ${player.name}`,
                    subtitle: `O jogador do ${sourceTeam.teamName} desperta interesse por sua versatilidade.`,
                    content: `Fontes ligadas ao ${buyer.teamName} confirmam que o nome de ${player.name} está no topo da lista de desejos para a próxima janela. O negócio pode girar em torno de valores significativos.`
                }
            ];

            const template = rumorTemplates[Math.floor(Math.random() * rumorTemplates.length)];

            articles.push({
                id: `rumor-${player.id}-${i}-${Date.now()}-${Math.random()}`,
                category: 'rumors',
                title: template.title,
                subtitle: template.subtitle,
                content: template.content,
                imageTag: 'transfer',
                date: 'Rumores',
                priority: player.overall >= 88 ? 1 : 2,
                relevantTeamNames: [sourceTeam.teamName, buyer.teamName],
                playerContext: {
                    name: player.name,
                    ovr: player.overall,
                    age: player.age,
                    nationality: player.nationalityId,
                    sourceTeam: sourceTeam.teamName,
                    targetTeam: buyer.teamName
                }
            });
        }

        return articles;
    }

    private _generateMatchStoryNews(): NewsArticle[] {
        const articles: NewsArticle[] = [];
        const history = this.universeService.matchHistory().slice(-15);
        const transfers = this.universeService.transferHistory();

        history.forEach(m => {
            // 1. Hat-tricks
            const allScorers = [...(m.homeScorers || []), ...(m.awayScorers || [])];
            const hatTrickPlayer = allScorers.find(s => s.goals >= 3);
            if (hatTrickPlayer) {
                articles.push({
                    id: `hattrick-${m.id}-${hatTrickPlayer.name}`,
                    category: 'results',
                    title: `SHOW DE BOLA: Hat-trick de ${hatTrickPlayer.name}!`,
                    subtitle: `O craque marcou três vezes na vitória do ${hatTrickPlayer.goals === m.homeScore ? m.homeTeamName : m.awayTeamName}.`,
                    content: `Uma atuação de gala! ${hatTrickPlayer.name} levou a bola para casa após destruir a defesa adversária com três gols. A performance coloca o atleta como sério candidato a craque da rodada na ${m.competitionName}.`,
                    imageTag: 'futebol',
                    date: 'Estatísticas',
                    priority: 1
                });
            }

            // 2. Law of the Ex (Lei do Ex)
            const homePlayersFromAway = transfers.filter(t => t.fromTeamName === m.awayTeamName && t.toTeamName === m.homeTeamName);
            const awayPlayersFromHome = transfers.filter(t => t.fromTeamName === m.homeTeamName && t.toTeamName === m.awayTeamName);

            const lawOfTheExScorer = m.homeScorers?.find(s => homePlayersFromAway.some(t => t.playerName === s.name)) ||
                m.awayScorers?.find(s => awayPlayersFromHome.some(t => t.playerName === s.name));

            if (lawOfTheExScorer) {
                const formerTeam = m.homeScorers?.includes(lawOfTheExScorer) ? m.awayTeamName : m.homeTeamName;
                articles.push({
                    id: `ex-${m.id}-${lawOfTheExScorer.name}`,
                    category: 'results',
                    title: `LEI DO EX: ${lawOfTheExScorer.name} castiga o ${formerTeam}!`,
                    subtitle: `O destino não perdoa: o ex-jogador da equipe marcou o gol decisivo.`,
                    content: `Clima pesado no reencontro. ${lawOfTheExScorer.name} não teve piedade do seu antigo clube e balançou as redes, gerando sentimentos mistos nas arquibancadas. O "fator ex" mais uma vez provou ser infalível no futsal moderno.`,
                    imageTag: 'goleada',
                    date: 'Narrativa',
                    priority: 2
                });
            }

            // 3. Derbies (Same country matches)
            const isSameCountry = this._isRivalry(m.homeTeamId, m.awayTeamId);
            if (isSameCountry && (m.homeScore + m.awayScore > 0)) {
                articles.push({
                    id: `derby-${m.id}`,
                    category: 'results',
                    title: `CLÁSSICO PELO MUNDO: ${m.homeTeamName} vs ${m.awayTeamName}`,
                    subtitle: `A rivalidade histórica pegou fogo em mais um duelo eletrizante.`,
                    content: `Muito mais que três pontos. O confronto entre ${m.homeTeamName} e ${m.awayTeamName} parou a cidade. Em um jogo tenso e cheio de alternativas, o placar de ${m.homeScore}-${m.awayScore} reflete a entrega de ambas as equipes neste derby.`,
                    imageTag: 'futebol',
                    date: 'Grandes Jogos',
                    priority: 1
                });
            }
        });

        return articles;
    }

    private _isRivalry(teamAId: string, teamBId: string): boolean {
        return teamAId.substring(0, 3) === teamBId.substring(0, 3);
    }

    private _generateTransferNews(): NewsArticle[] {
        const articles: NewsArticle[] = [];
        const transfers = this.universeService.transferHistory();
        const currentSeason = this.universeService.season();
        const seasonTransfers = transfers.filter(t => t.season === currentSeason).slice(-5);

        seasonTransfers.forEach(t => {
            const isBlockbuster = t.fee > 60_000_000;
            const templates = [
                {
                    title: isBlockbuster ? `HISTÓRICO: ${t.playerName} é do ${t.toTeamName}!` : `CONFIRMADO: ${t.playerName} assina com o ${t.toTeamName}`,
                    subtitle: `Negociação fechada em ${this._formatCurrency(t.fee)}.`,
                    content: `É oficial! O ${t.toTeamName} anunciou a contratação definitiva de ${t.playerName}. O jogador deixa o ${t.fromTeamName} após semanas de negociações intensas. ${isBlockbuster ? 'Esta é uma das maiores transferências da história do esporte.' : 'O reforço chega para elevar o patamar técnico da equipe.'}`
                },
                {
                    title: `Nova Era: ${t.playerName} apresentado no ${t.toTeamName}`,
                    subtitle: `Torcida comparece em peso para receber o novo reforço.`,
                    content: `Vestindo a nova camisa, ${t.playerName} prometeu empenho total no ${t.toTeamName}. A venda por parte do ${t.fromTeamName} foi vista como estratégica para equilibrar as contas, enquanto o comprador garante um talento de elite.`
                }
            ];

            const template = templates[Math.floor(Math.random() * templates.length)];
            articles.push({
                id: `transfer-${t.playerName}-${Date.now()}`,
                category: 'transfers',
                title: template.title,
                subtitle: template.subtitle,
                content: template.content,
                imageTag: 'transfer',
                date: 'Mercado',
                priority: isBlockbuster ? 1 : 2,
                relevantTeamNames: [t.fromTeamName, t.toTeamName]
            });
        });

        return articles;
    }

    private _generateMatchNews(): NewsArticle[] {
        const articles: NewsArticle[] = [];
        const history = this.universeService.matchHistory().slice(-10);

        history.forEach(m => {
            const diff = Math.abs(m.homeScore - m.awayScore);
            const winner = m.homeScore > m.awayScore ? m.homeTeamName : m.awayTeamName;
            const loser = m.homeScore > m.awayScore ? m.awayTeamName : m.homeTeamName;
            const totalGoals = m.homeScore + m.awayScore;

            if (diff >= 5) {
                articles.push({
                    id: `slaughter-${m.id}`,
                    category: 'results',
                    title: `HISTÓRICO: O Massacre do ${winner}!`,
                    subtitle: `Um sonoro ${m.homeScore} a ${m.awayScore} que entra para os livros da ${m.competitionName}.`,
                    content: `Domínio absoluto. O ${winner} não tomou conhecimento do ${loser} e aplicou uma goleada que será lembrada por anos. Uma aula de futsal ofensivo que deixa o adversário em crise profunda.`,
                    imageTag: 'goleada',
                    date: 'Resultados',
                    priority: 1
                });
            } else if (totalGoals >= 10) {
                articles.push({
                    id: `festival-${m.id}`,
                    category: 'results',
                    title: `FESTIVAL DE GOLS: Chuva de bolas na rede!`,
                    subtitle: `${m.homeTeamName} e ${m.awayTeamName} proporcionaram um espetáculo de ${totalGoals} gols.`,
                    content: `Para quem gosta de ataque, este foi O jogo. Erros defensivos ou ataques brilhantes? Não importa. O público saiu extasiado com o placar de ${m.homeScore}-${m.awayScore}. Um verdadeiro comercial para o esporte.`,
                    imageTag: 'futebol',
                    date: 'Resultados',
                    priority: 2
                });
            }
        });

        return articles;
    }

    private _generateFormNews(): NewsArticle[] {
        const articles: NewsArticle[] = [];
        const leagues = this.universeService.leagues();

        leagues.forEach(l => {
            const div = l.divisions[0];
            if (div && div.teams.length > 3) {
                const sorted = [...div.teams].sort((a, b) => (b.stats?.points || 0) - (a.stats?.points || 0));
                const leader = sorted[0];
                const second = sorted[1];

                if (leader.stats?.points > 9 && (leader.stats.points - second.stats.points <= 2)) {
                    articles.push({
                        id: `race-${l.countryId}`,
                        category: 'form',
                        title: `LUTA PELO TOPO: Corrida Insana na ${l.countryName}`,
                        subtitle: `${leader.teamName} e ${second.teamName} travam duelo ponto a ponto.`,
                        content: `A temperatura subiu! A disputa pela liderança está pegando fogo, com apenas ${leader.stats.points - second.stats.points} pontos separando os gigantes. Cada rodada agora tem peso de final.`,
                        imageTag: 'tabela',
                        date: 'Classificação',
                        priority: 2
                    });
                }
            }
        });

        return articles;
    }

    private _generateAwardNews(): NewsArticle[] {
        const articles: NewsArticle[] = [];
        const podium = this.universeService.bestPlayerOfTheSeasonPodium();

        if (podium && podium.length > 0) {
            const winner = podium[0];
            articles.push({
                id: `award-best-player-${Date.now()}`,
                category: 'awards',
                title: `O MUNDO AOS SEUS PÉS: ${winner.player?.name} é Bola de Ouro!`,
                subtitle: `O astro do ${winner.teamName} atinge o topo do Olimpo do futsal.`,
                content: `A espera acabou. ${winner.player?.name} foi coroado o melhor jogador do planeta nesta temporada. Com uma combinação de técnica refinada e frieza nas decisões, o craque do ${winner.teamName} superou todos os concorrentes.`,
                imageTag: 'trophy',
                date: 'Gala de Ouro',
                priority: 1
            });
        }

        return articles;
    }

    private _formatCurrency(value: number): string {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);
    }
}
