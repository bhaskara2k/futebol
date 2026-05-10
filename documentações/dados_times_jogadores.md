# Documentação: Criação de Times e Jogadores (Data)

Este documento explica como adicionar novos times e jogadores manualmente aos arquivos de dados do projeto, garantindo que o simulador reconheça as novas informações ao iniciar um novo jogo.

---

## 📂 Organização dos Arquivos de Dados

Os dados estão organizados por continente na pasta `src/data/`:

- `europe.data.ts`: Times europeus.
- `south-america.data.ts`: Times sul-americanos (incluindo Brasil e Argentina).
- `africa.data.ts`: Times africanos.
- `asia.data.ts`: Times asiáticos.
- `north-america.data.ts`: Times da América do Norte e Central.
- `other.data.ts`: Seleções de estrelas ou times especiais.
- **`index.ts`**: O arquivo central que combina todos os itens acima.

---

## 🏗️ Estrutura de um Time

Para adicionar um time, você deve inserir um objeto no array do respectivo continente.

```typescript
{
  teamName: "NOME DO TIME",
  countryId: "BRA", // Código de 3 letras do país
  players: [
    // Lista de jogadores aqui...
  ]
}
```

### Regras Importantes:
1. **`teamName`**: Use letras maiúsculas para manter a consistência visual.
2. **`countryId`**: Deve obrigatoriamente corresponder a um país registrado no `UniverseService`.
3. **Mínimo de Jogadores**: O ideal é fornecer pelo menos **5 jogadores** (um time completo de futsal). Se houver menos de 5, o sistema completará o time com jogadores de base aleatórios.

---

## 🏃 Estrutura de um Jogador

Cada jogador dentro do array `players` segue este formato:

```typescript
{
  number: 10,           // Número da camisa
  name: "NOME COMPLETO", // Nome do jogador
  age: 25,              // Idade (influencia a evolução)
  nationalityId: "BRA", // Nacionalidade (código de 3 letras)
  overall: 80,          // Nível de habilidade (40 a 99)
  contractYears: 2      // Anos de contrato restantes
}
```

### Atributos do Jogador:
- **`overall`**: Define o quão bom o jogador é. Jogadores acima de 80 são considerados "Elite".
- **`contractYears`**: Se chegar a 0 ao final da temporada, o jogador pode se tornar um agente livre (Free Agent).
- **Goleiros**: Por padrão, o jogador na **posição 0** (o primeiro da lista) é considerado o goleiro titular pelo simulador.

---

## 🔄 Como Aplicar as Mudanças

1. **Edite o arquivo correspondente**: Adicione seu novo time no final do array em `src/data/continente.data.ts`.
2. **Verifique o `index.ts`**: Certifique-se de que o array do continente está sendo importado e "espalhado" (`...`) dentro do array `customPlayersData`.
3. **Inicie um Novo Jogo**: As mudanças no `data` só surtem efeito quando você clica em **"Novo Jogo"**. Jogos salvos (Saves) não são afetados por mudanças nos arquivos de dados após terem sido criados.

---

## 💡 Dicas de Preenchimento

- **Agentes Livres:** Você pode adicionar jogadores a um time chamado "SEM EQUIPE" (countryId: "AAA") se quiser que eles comecem o jogo disponíveis para contratação.
- **Bandeiras:** O `nationalityId` determina qual bandeira aparecerá ao lado do nome do jogador na interface.
- **Equilíbrio:** Ao criar uma nova liga, tente manter a média de Overall dos times próxima (ex: todos entre 70 e 75) para que a competição seja equilibrada.

---

**Nota:** Se você deseja criar nomes brasileiros aleatórios em massa, pode consultar o arquivo `src/name-generator.data.ts` para ver quais nomes e sobrenomes o sistema usa internamente.
