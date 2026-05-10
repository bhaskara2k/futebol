# Documentação: Motor de Simulação de Partidas

Este documento descreve o funcionamento interno da simulação de partidas no Futsal Universe Simulator, detalhando os algoritmos de pontuação, atribuição de eventos e como o Overall influencia o resultado.

---

## 📂 Arquivo Principal
A lógica de simulação está centralizada no serviço:
- **Caminho:** `src/services/simulation.service.ts`
- **Métodos Principais:** `simulateMatch()`, `_calculateMatchScore()`, `assignGoalEvents()`.

---

## ⚽ 1. O Algoritmo de Gols (Distribuição de Poisson)

O jogo não usa apenas um "sorteio simples". Ele utiliza uma **Distribuição de Poisson** para gerar um número realista de gols para cada time de forma independente.

### Como o cálculo é feito (`_calculateMatchScore`):
Para cada time, é calculado um valor chamado **lambda** (a média esperada de gols):

1. **Base:** `lambda = Overall / 45` (Ex: um time 90 tem base de 2.0).
2. **Fator Casa:** Se o time for o mandante, ganha um bônus de **+0.2** no lambda.
3. **Diferença de Nível:** É adicionada a diferença de Overall entre os times dividida por 25: `(Time - Oponente) / 25`.
4. **Piso:** O lambda nunca é menor que **0.2**.
5. **Teto:** O número máximo de gols por partida é travado em **8** (para evitar placares irreais de futsal no simulador).

### Exemplo de Cálculo:
- Time Casa (80) vs Time Fora (70)
- Lambda Casa: `(80/45) + 0.2 + (80-70)/25` = `1.77 + 0.2 + 0.4` = **2.37**
- Lambda Fora: `(70/45) + (70-80)/25` = `1.55 - 0.4` = **1.15**

---

## 🎯 2. Atribuição de Gols e Assistências

Após definir *quantos* gols foram marcados, o sistema escolhe *quem* marcou.

### Peso por Overall (`pickPlayerByWeight`):
A escolha não é puramente aleatória. Jogadores melhores têm muito mais chance de participar dos gols.
- O peso de cada jogador é o seu **Overall ao quadrado** (`overall * overall`).
- Isso significa que um jogador 90 tem muito mais que o dobro de chance de um 45; a proporção é quadrática (`8100` vs `2025`).

### Regras de Eventos:
1. **Gols:** Apenas jogadores de linha (não-goleiros) marcam.
2. **Assistências:** **100% dos gols** têm assistência atribuída a outro jogador de linha do mesmo time.
3. **Minutos:** Os minutos são sorteados aleatoriamente entre **1 e 40** (tempo padrão do futsal).

---

## 🌟 3. Melhor da Partida (MOTM)

O prêmio de Melhor da Partida (`assignMotm`) é decidido por uma pontuação interna após o apito final:

| Ação | Pontos |
| :--- | :--- |
| **Cada Gol Anotado** | +15 pts |
| **Cada Assistência** | +8 pts |
| **Vitória do Time** | +10 pts |
| **Overall (Base)** | Overall / 10 |
| **Goleiro (Clean Sheet)** | +15 pts |
| **Goleiro (Gol Sofrido)** | -2 pts por gol |

O jogador com a maior pontuação total recebe o prêmio MOTM e ganha +1 no seu registro de carreira e estatísticas da temporada.

---

## 📉 4. Estatísticas e Carreira

Ao final de cada simulação, o motor atualiza automaticamente:
- **Players:** `stats` (temporada atual), `careerStats` (histórico total no país) e `careerStatsByClub` (histórico no clube atual).
- **Teams:** Tabela classificatória (vitorias, gols, pontos, saldo).
- **History:** Grava o resultado no histórico de confrontos Diretos (H2H) e registro histórico do save.

---

## 🎲 5. Aleatoriedade (The "Chaos" Factor)

Embora o Overall dite a tendência, a aleatoriedade (`Math.random()`) dentro da fórmula de Poisson permite:
- **Zebras:** Um time 60 pode vencer um 80, embora estatisticamente raro.
- **Empates:** Ocorrem naturalmente quando as lambdas resultam no mesmo número de gols através do sorteio.
- **Disputa de Pênaltis:** Em jogos de mata-mata que terminam empatados, o sistema realiza um sorteio simples de pênaltis (`1 a 5` gols) para definir o vencedor.

---

**Nota Técnica:** O tempo total de jogo é de 40 minutos. Para partidas de **Mata-Mata (CupMatch)**, o sistema processa as regras de gols fora e saldo agregado de forma automática em jogos de ida e volta.
