# Proposta de Sistema: Rivalidades Dinâmicas e Histórico de Confrontos

Este documento detalha o conceito e a lógica para a implementação de um sistema que detecta e destaca rivalidades automáticas entre os times, baseando-se em eventos ocorridos durante a simulação do universo.

---

## 🎯 Objetivo
Transformar a observação em algo mais profundo, permitindo que o usuário identifique "Derbies" (clássicos) que nasceram organicamente através de disputas de títulos, finais épicas ou goleadas históricas.

---

## 🧠 1. Lógica de Detecção (Sistema de Pontuação)

O sistema deve manter uma matriz oculta de "Pontos de Tensão" entre os times. Quando a tensão ultrapassa um limite (ex: 50 pontos), os times são marcados como **"Rivais de Era"**.

### Como os pontos são acumulados:
| Evento | Pontos de Tensão | Explicação |
| :--- | :--- | :--- |
| **Final de Copa** | +15 pts | Enfrentar o mesmo time em uma final (Libertadores, CL, Copa Nacional). |
| **Corrida pelo Título** | +10 pts | Terminar em 1º e 2º na liga com diferença menor que 3 pontos. |
| **Goleada Histórica** | +8 pts | Vencer o confronto direto por 4 ou mais gols de diferença. |
| **Eliminação Direta** | +5 pts | Eliminar o outro time em fases de mata-mata (quartas, semis). |
| **Confronto frequente** | +2 pts | Enfrentar o mesmo time em 3 ou mais competições diferentes no mesmo ano. |

---

## 🖥️ 2. Exibição no Modal da Equipe (UI)

A ideia é que, ao abrir os detalhes de um time, haja uma nova seção chamada **"Relações e Legado"**.

### Destaques Visuais:
- **O Rival Real:** Exibir o escudo e o nome do time com maior pontuação de tensão acumulada.
- **Termômetro de Rivalidade:** Uma barra visual (Frio -> Quente -> Fogo) baseada na pontuação atual de tensão.
- **Histórico H2H de Elite:** Placar geral apenas contra esse rival (Vitórias, Empates, Derrotas).

### Seção "Finais Históricas":
Uma lista cronológica detalhando os momentos em que a rivalidade "ferveu":
- *2026: Perdeu a Final da Champions League para este rival (2-3).*
- *2028: Conquistou a Copa Nacional em cima deste rival (5-4 nos pênaltis).*

---

## ⚽ 3. Impacto na Simulação (Opcional)

Para tornar os clássicos mais imprevisíveis, o motor de simulação (`simulation.service.ts`) pode aplicar o **"Fator Derby"**:

- Quando dois **Rivais de Era** se enfrentam:
    - O Overall do time mais fraco recebe um bônus temporário de **+3 a +5** (garra adicional).
    - A chance de empate aumenta em 15%.
    - Aumenta a probabilidade de um jogador ganhar o prêmio de MOTM (pelo peso emocional da partida).

---

## 🛠️ Sugestão de Implementação Técnica

1.  **Modelo de Dados:** Adicionar um campo `rivalries` no objeto `Team` (ou uma tabela separada no SQLite).
2.  **Trigger de Temporada:** Ao final de cada temporada, o `SeasonService` analisa as posições finais e os campeões para distribuir os pontos de tensão.
3.  **Persistência:** Salvar esses pontos no banco de dados para que a rivalidade persista por décadas de simulação.

---

**Nota:** Este sistema transforma o jogo de uma simples "tabela de números" para um "gerador de histórias", onde o observador começa a torcer contra ou a favor de certos times dựa nas mágoas passadas da simulação.
