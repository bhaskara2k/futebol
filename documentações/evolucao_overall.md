# Documentação: Evolução de Overall dos Jogadores

Este documento explica como funciona o sistema de evolução (e regressão) dos atributos (Overall) dos jogadores no projeto Futsal Universe Simulator, detalhando os cálculos, coeficientes e os arquivos que devem ser alterados para ajustar esse comportamento.

## 📂 Arquivo Principal
Toda a lógica de evolução está centralizada no serviço de temporada:
- **Caminho:** `src/services/season.service.ts`
- **Método:** `updatePlayerOveralls()`

---

## 🚀 Como Funciona a Evolução

A evolução ocorre ao final de cada temporada e é composta por três fatores principais:
1. **Base por Idade:** Ganhos naturais de jovens e perdas naturais de veteranos.
2. **Performance:** Modificadores baseados no desempenho real durante a temporada (gols, assistências, MOTM e troféus).
3. **Limitadores:** Travas que impedem que jogadores evoluam ou regridam rápido demais dependendo do seu nível atual.

---

## 📊 1. Ganhos e Perdas por Idade (Base Change)

Localizado nas linhas aproximadas (308-312):

| Faixa Etária | Mudança Base (Overall) |
| :--- | :--- |
| Menor que 17 anos | +1 a +2 (aleatório) |
| 17 ou 18 anos | +1 |
| 19 a 32 anos | 0 |
| 33 a 35 anos | -1 |
| 36 ou 37 anos | -2 |
| 38 anos ou mais | -3 |

---

## ⚽ 2. Modificadores de Performance

O sistema calcula um `performanceModifier` que varia de **-2 a +3**.

### Para Goleiros (Linhas 319-336)
O cálculo baseia-se na defesa do time comparada à média da divisão:
- **Cálculo:** `defensivePerformanceScore = (Proporção Real - Proporção Esperada) * 15`
- **Proporção Real:** Média de Gols Sofridos da Divisão / Média de Gols Sofridos do Time.
- **Proporção Esperada:** `1 + (Overall - 75) / 100`.
- **Bônus Adicional:** MOTM (*3.0) e Troféus (*2.0).

### Para Jogadores de Linha (Linhas 338-348)
O cálculo compara a pontuação real com a esperada para o seu nível:
- **Pontuação Real:** `(Gols * 1.5) + (Assis * 1.0) + (MOTM * 2.0) + (Troféus * 2.0)`.
- **Pontuação Esperada:** `((Overall - 62) * 3.0) * Modificador de Liga`.
- **Modificador de Liga:** Ligas mais fortes (com média de overall maior) dificultam a obtenção de bônus de performance.

#### Tabela de Modificadores (Delta):
- **Delta > 60:** +3
- **Delta > 40:** +2
- **Delta > 20:** +1
- **Delta > -30:** 0
- **Delta > -45:** -1
- **Abaixo de -45:** -2

---

## 🛡️ 3. Limitadores e Trava de Elite (Linhas 358-366)

Para manter o realismo, o sistema limita a mudança final (`base + performance`) conforme o nível do jogador:

| Overall Atual | Variação Máxima Permitida (Temporada) |
| :--- | :--- |
| **89 ou mais (Elite)** | -1 a +1 |
| **82 a 88** | -2 a +2 |
| **60 a 81** | -2 a +2 |
| **Abaixo de 60** | -4 a +3 |

### Regra de Veteranos (Linhas 352-355):
Jogadores com **32 anos ou mais** que tiverem excelente performance (Modificador >= 2) podem ter sua queda por idade anulada ou até mesmo ter um leve ganho, simulando jogadores que "envelhecem como vinho".

---

## 👶 4. Evolução da Base (Youth Academy)

Localizado nas linhas (372-385):
- **Até 18 anos:** Ganho de 0 a +2.
- **19 a 21 anos:** Ganho de 0 a +1.
- **Cap Máximo:** Jogadores na academia não passam de **75 de Overall**.

---

## 🏆 5. Bônus Especial: Melhor do Mundo

O vencedor do prêmio de melhor jogador da temporada (Ballon d'Or) recebe um boost garantido de **+2 a +3** de Overall (Linhas 300-305).

---

## 🛠️ Guia: Como Alterar

### Para aumentar o crescimento de jovens:
1. Vá até as linhas `308-309`.
2. Aumente os valores no `this.getRandomValue(min, max)`.

### Para tornar a regressão de idade mais severa:
1. Vá até as linhas `310-312`.
2. Diminua os valores (ex: mudar -1 para -2).

### Para ajustar a dificuldade de evoluir em overall alto:
1. Vá até as linhas `358-366`.
2. Altere os limites no `Math.min` e `Math.max`. Ex: Para permitir que um elite suba +2, mude `Math.min(1, overallChange)` para `Math.min(2, overallChange)`.

### Para alterar o peso dos gols/assistências:
1. Vá até a linha `338`.
2. Altere os coeficientes (ex: `totalGoals * 2.0` em vez de `1.5`).

---

**Nota:** Após qualquer alteração no arquivo `season.service.ts`, o Angular recompilará automaticamente. As mudanças passarão a valer na próxima vez que uma temporada for finalizada no jogo.
