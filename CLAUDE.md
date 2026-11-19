# Raízes Profundas — regras do projeto

Jogo de sobrevivência/sandbox 2D para navegador, em JavaScript puro com módulos ES e sem build.
Para rodar: `npx http-server@14.1.1 -p 8765 -c-1` na raiz e abrir `http://localhost:8765/`.
Os módulos ES não funcionam via `file://`.

## Arquitetura

As camadas só dependem das camadas de baixo. Nenhum módulo executa lógica de jogo ao ser importado.

```
core/    utilitários puros, estado (G, UI), eventos, configurações, entrada
data/    SÓ dados: itens, receitas, paredes, biomas, inimigos. Sem lógica, sem DOM, sem estado
world/   classe World, geradores (caverna, superfície), iluminação
game/    regras de jogo: jogador, inventário/criação, inimigos/projéteis, entidades, save
audio/   engine (Web Audio), sfx (efeitos), soundscape (música + ambiente)
render/  desenho no canvas: ícones, sprites, renderer, minimapa. Só lê o estado
ui/      DOM: HUD, painel de inventário/criação/baú, menus, toasts
main.js  ponto de entrada: liga entrada, loop e fluxo de telas
```

- **Estado mutável só em `core/state.js`** (`G` para o jogo, `UI` para a interface). Variáveis globais soltas são proibidas.
- **Separação de responsabilidades:**
  - A lógica (`game/`, `world/`) nunca toca o DOM. Ela se comunica com a interface por eventos (`emit('toast')`, `emit('inv')`, `emit('chest')`).
  - O render nunca altera o estado do jogo.
  - O áudio é chamado só pela fachada `sfx.*` ou por `initAudio`/`applyVolume`/`setSpace`.
- **Conteúdo novo entra em `data/`.** Um item, uma receita, um inimigo ou uma parede novos devem exigir o mínimo possível de mudança na lógica: os comportamentos são dirigidos por campos dos dados (`ai`, `shape`, `drops`, `mat`…).
- **Mundo:** cada camada (superfície, caverna) é uma instância de `World`. O mundo ativo é `G.world`. Nunca guarde referências a arrays do mundo fora dele.
- **Um arquivo, uma responsabilidade.** O alvo é até ~400 linhas por arquivo. Se passar disso, divida.

## Código limpo

- Use `const` por padrão e `let` só quando houver reatribuição. Nada de `var`.
- Funções pequenas, com nome que diz o que fazem. Prefira retorno antecipado a `if` aninhado.
- **Nomes:**
  - `camelCase` para funções e variáveis.
  - `PascalCase` para classes.
  - `UPPER_SNAKE` para tabelas de dados e constantes.
  - `snake_case` para ids de itens e inimigos.
- O texto mostrado ao jogador fica em PT-BR. Os comentários são curtos, em português, e explicam o *porquê*.
- Proibido: código morto, código comentado e "números mágicos" repetidos. Constantes nomeadas vão em `core/state.js` ou em `data/`.
- Sempre envolva `localStorage` em `try/catch`. O jogo precisa funcionar sem ele.
- O save é versionado (`SAVE_VERSION`). Toda mudança de formato precisa de uma migração em `game/save.js`.

## Desempenho

- Os mapas são `Uint8Array` indexados por `y*size+x`. Não crie objetos por tile.
- Loops quentes (render, luz, IA) não alocam por frame: nada de arrays ou closures novos dentro deles.
- **Render:** desenhe só a área visível. Cores derivadas passam por cache (`shadeCached`). Ícones são desenhados uma vez e reaproveitados.
- **Luz:** use BFS limitada à região visível e `ImageData` escalado com suavização.
- **DOM:** o HUD só escreve no DOM quando o valor muda. As listas (inventário, criação) são reconstruídas por evento, nunca a cada frame.
- **Áudio:** sons espaciais sem volume audível (`m <= 0`) não criam nós.

## Verificação antes de entregar

1. O jogo abre sem erros no console, tanto num mundo novo quanto continuando um save.
2. A funcionalidade nova foi exercitada no navegador embutido (por script ou de verdade).
3. Testes nunca sobrescrevem o save do jogador. Faça backup antes (`window.name`) e restaure depois.
