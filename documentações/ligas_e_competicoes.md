# Documentação: Estrutura de Ligas, Países e Competições

Este documento fornece um guia técnico sobre como expandir o universo do Futsal Universe Simulator, permitindo a adição de novos países, ligas e a personalização de formatos de competição.

---

## 🌍 1. Como Adicionar um Novo País

Para que um país exista no sistema, ele precisa ser registrado no serviço principal do universo.

**Arquivo:** `src/services/universe.service.ts`

1.  **Mapear o Nome:** Adicione o código de 3 letras (ISO) e o nome em português no objeto `COUNTRY_NAMES` (aprox. linha 96).
    ```typescript
    public readonly COUNTRY_NAMES: { [key: string]: string } = {
      // ...
      CAN: 'Canadá', // Exemplo
    };
    ```
2.  **Mapear o Continente:** Adicione o código do país no objeto `CONTINENT_MAP` (aprox. linha 328) para que ele participe das competições continentais corretas.
    ```typescript
    private readonly CONTINENT_MAP: { [key: string]: string } = {
      'CAN': 'NCA', // NCA = América do Norte
    };
    ```
3.  **Ativar a Liga:** Adicione o código à lista `LEAGUE_IDS` (aprox. linha 84) ou a uma das sublistas temáticas (ex: `FOUR_TEAM_LEAGUE_IDS`) para que o sistema gere a liga automaticamente no início de um novo save.

---

## 🛠️ Passo a Passo: Criando uma Nova Liga do Zero

Para criar uma liga totalmente nova (ex: Japão ou México), siga estes passos:

1.  **Registro do País (`universe.service.ts`):**
    *   Adicione o código ISO (ex: `JPN`) em `COUNTRY_NAMES`.
    *   Mapeie o continente em `CONTINENT_MAP` (ex: `JPN: 'ASI'`).
2.  **Definição do Tamanho da Liga (`universe.service.ts`):**
    *   Adicione o código ao array correspondente ao número de times desejado:
        *   `FOUR_TEAM_LEAGUE_IDS`: Ligas com 4 times.
        *   `EIGHT_TEAM_SAM_LEAGUE_IDS` (ou similares): Ligas com 8 times.
        *   Se não adicionar em nenhum array específico, o sistema tentará criar o formato padrão (geralmente 3 divisões).
3.  **Configuração da Estrutura (`universe.service.ts` > `createLeague`):**
    *   Se quiser um formato único (ex: 1 divisão apenas ou 4 divisões), crie um bloco `if (countryId === 'SEU_CODIGO')` dentro de `createLeague` e defina os `slice` dos times.
4.  **Dados dos Times e Jogadores (`src/data/index.ts`):**
    *   O passo mais importante: adicione os objetos de times e jogadores para esse novo país no arquivo de dados. 
    *   Cada time deve ter o `countryId` correto.
    *   Se o sistema não encontrar times suficientes nos dados, ele usará o `generateYouthPlayer` para criar jogadores aleatórios, mas o time precisa ao menos estar definido na lista de times iniciais.

---

A estrutura de cada liga (quantas divisões, quantos times) é definida no método `createLeague`.

**Arquivo:** `src/services/universe.service.ts`
**Método:** `createLeague(countryId, teams, ...)`

### Alterar Quantidade de Times por Divisão
Dentro do `createLeague`, procure o bloco correspondente ao país ou ao tipo de liga. O número de times é definido pelo `slice` do array de times:

```typescript
if (countryId === 'BRA') {
  const div1Teams = teams.slice(0, 16);  // 16 times na D1
  const div2Teams = teams.slice(16, 32); // 16 times na D2
  // ...
}
```
*Para mudar para 20 times, você alteraria para `slice(0, 20)` e `slice(20, 40)`, etc.*

### Alterar Número de Divisões
Mude o array `divisions` no retorno do método:
```typescript
return {
  // ...
  divisions: [division1, division2], // Apenas duas divisões
  // ...
};
```

---

## ⬆️ 3. Regras de Rebaixamento e Promoção

As regras de quem sobe e quem desce são processadas na transição de temporada.

**Arquivo:** `src/services/season.service.ts`
**Método:** `startNewSeason()`

Procure os blocos condicionais por país. Exemplo do Brasil (Série A para B):
```typescript
const relegatedFromA = d1s.slice(-4); // Pega os 4 últimos (-4)
const promotedFromB = d2s.slice(0, 4);  // Pega os 4 primeiros (0 a 4)
```
*Para mudar para apenas 2 rebaixados, altere para `slice(-2)` e `slice(0, 2)`.*

---

## 🍷 4. Adicionar ou Alterar Copas e Mata-matas

Existem dois tipos principais de competições: **Liga** (pontos corridos) e **Cup** (mata-mata).

### Adicionar uma Copa Nacional
No `createLeague` (`universe.service.ts`), você pode definir o objeto `cup`.
O sistema possui geradores automáticos:
- `this.generateCup(timesD1, timesD2)`: Gera uma copa padrão.
- `this.generateBrazilianCup(todosTimes)`: Gera o formato específico da Copa do Brasil.

### Criar um Formato de Mata-mata (Manual)
Se quiser criar uma competição personalizada de mata-mata (ex: Supercopa):
1. Defina as rodadas (`CupRound`).
2. Adicione os jogos (`matches`).
3. Monte o objeto `Cup`.

Exemplo básico de estrutura de mata-mata:
```typescript
const quarters: CupRound = { name: 'Quartas de Final', matches: [] };
// Adicionar matches ao array...

const supercup: Cup = {
  rounds: [quarters, { name: 'Semi', matches: [] }, { name: 'Final', matches: [] }],
  topScorers: [], topAssists: [], topMotm: []
};
```

### Adicionar Mata-mata ao final da Liga (Playoffs)
Atualmente, as ligas nacionais são pontos corridos. Para adicionar um playoff:
1. No `createLeague`, adicione uma propriedade customizada ou use o sistema de `Cup` para representar os playoffs.
2. É necessário modificar o `competition.service.ts` para que ele saiba que após a última rodada da liga, deve iniciar a fase de playoffs.

---

## 🛠️ Resumo de Arquivos Chave

| Objetivo | Arquivo | O que procurar |
| :--- | :--- | :--- |
| **Paises/Nomes** | `universe.service.ts` | `COUNTRY_NAMES`, `CONTINENT_MAP` |
| **Estrutura da Liga** | `universe.service.ts` | `createLeague`, `LEAGUE_IDS` |
| **Sobe/Desce** | `season.service.ts` | `startNewSeason`, `slice(-4)` |
| **Lógica de Jogos** | `simulation.service.ts` | `simulateMatch` |
| **Gerar Copas** | `universe.service.ts` | `generateCup`, `generateBrazilianCup` |

---

**Dica:** Ao adicionar muitos times ou ligas, certifique-se de que o arquivo `src/data/index.ts` possua jogadores suficientes criados para preencher esses novos times, ou o sistema usará o gerador automático para preencher as lacunas.
