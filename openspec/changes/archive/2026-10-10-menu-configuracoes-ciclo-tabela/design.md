## Context

A tela de Saldo (`frontend/src/telas/saldo.ts`) é montada à mão com `h()`: cabeçalho com "Olá, X" e um botão de texto "Sair", o painel do saldo, o botão "+ Adicionar conta", três atalhos em grade (`Paguei`, `Histórico`, `Proporção`) e o painel "Ciclo atual" como `<dl>` de seis linhas. O visual é o do app inteiro: verde-azulado (`--acento`), tipografia do sistema a 18px, painéis com raio de 16px, tema claro/escuro por `prefers-color-scheme`, tela de no máximo 480px. Motivação e escopo em `proposal.md`; requisitos em `specs/pwa-ui`.

`GET /api/saldo` já devolve `proporcao`, `cicloAberto.totalDespesas`, `cicloAberto.pago` e `cicloAberto.parte`, em centavos. Nada muda no backend.

## Goals / Non-Goals

**Goals:**
- O menu de configurações e a tabela do ciclo, como descritos nos specs.
- Manter a identidade visual existente: a mudança deve parecer parte do mesmo app, não um retoque solto.
- Funcionar de 320px a 480px de largura, em claro e escuro, com teclado e leitor de tela.

**Non-Goals:**
- Redesenhar o app, trocar paleta ou tipografia.
- Destacar a coluna da pessoa logada, mostrar acertos ou saldo dentro da tabela.
- Levar outras telas (Histórico, Compra) para o menu; ele só existe na tela de Saldo.
- Mudar a tela de Proporção ou o fluxo de preview.

## Decisions

### D1. Direção visual: continuar o app, gastar o cuidado no total e na tabela

Plano feito com a skill frontend-design e revisado contra os padrões genéricos antes de entrar aqui.

- **Cor**: as existentes (`--fundo`, `--superficie`, `--texto`, `--texto-suave`, `--borda`, `--acento`, `--acento-suave`). Nenhuma cor nova.
- **Tipo**: `system-ui` já em uso. O total ganha tamanho e peso (cerca de 2rem, 750) com `font-variant-numeric: tabular-nums`; cabeçalhos de coluna e rótulos de linha ficam em `--texto-suave`, em caixa normal (sem caixa alta e sem rótulo acima do número).
- **Layout**: um único painel "Ciclo atual", conteúdo alinhado à esquerda no título e no total; tabela com números alinhados à direita.
- **Princípio**: o total é o único elemento de destaque do painel; a tabela fica quieta (linhas finas de `--borda`, sem zebra, sem cartão por pessoa, sem fundo colorido).

```
┌──────────────────────────────┐
│ Olá, Ariel                 ⚙ │   ⚙ = botão 48x48, alinhado à direita
│                              │
│ ┌──────────────────────────┐ │
│ │ Isabella deve R$ 48,00   │ │   painel do saldo (inalterado)
│ └──────────────────────────┘ │
│ [   + Adicionar conta      ] │
│ [  Paguei  ] [ Histórico  ]  │   2 colunas (antes 3)
│                              │
│ Ciclo atual                  │
│ Total das contas             │
│ R$ 120,00                    │   destaque do painel
│                              │
│              Ariel Isabella  │
│ Proporção      60%      40%  │
│ Pagou      R$ 120,00 R$ 0,00 │
│ Parte       R$ 72,00 R$ 48,00│
└──────────────────────────────┘
```

Revisão contra o padrão: descartei (a) um herói de "número grande + gradiente + estatísticas de apoio", porque o total aparece uma vez só e basta o contraste de tamanho; (b) cabeçalhos de coluna em caixa alta com espaçamento, que é marca de gerador; (c) cartões separados para Ariel e Isabella, que repetiriam rótulos e dificultariam a comparação lado a lado, que é o objetivo da tabela; (d) animação de abertura do menu, porque não ajuda a entender nada.

### D2. Menu: `<dialog>` não modal posicionado sob o botão, no padrão de `confirmar()`

O app já usa `<dialog>` em `confirmar()` (`ui/componentes.ts`), que dá de graça fechar com Esc, foco preso e devolução de foco. O menu usa `<dialog>` aberto com `showModal()`, com `::backdrop` transparente e posicionado no canto superior direito (abaixo do botão), contendo dois botões com `role="menuitem"` dentro de um `role="menu"`. O botão de abertura tem `aria-haspopup="menu"`, `aria-expanded` e `aria-label="Configurações"`. Tocar no backdrop fecha (mesmo tratamento de `confirmar()`); escolher uma opção fecha e então executa a ação.

Alternativas: (a) `popover` nativo do HTML, rejeitado por exigir iOS/Safari 17+ e o app é usado em celulares que não controlamos; (b) `div` com `hidden` e listeners globais de clique fora/Esc, rejeitado por reimplementar à mão foco, Esc e limpeza de listeners; (c) bottom sheet, rejeitado por mover o alvo para longe do botão que o abriu.

O componente fica em `ui/` (função que recebe os itens e devolve o botão e o `<dialog>`), para poder ser reutilizado se outras telas ganharem o menu.

### D3. Ícone de engrenagem como SVG inline criado por `createElementNS`

`h()` usa `document.createElement`, que não cria elementos SVG. Um helper pequeno em `ui/` monta o SVG (traço `currentColor`, `aria-hidden="true"`) por `createElementNS`, sem `innerHTML`, preservando a regra do projeto de que o DOM é construído só com nós. Sem biblioteca de ícones e sem arquivo de imagem extra. A cor segue `--texto-suave` e o foco usa o `button:focus-visible` já global.

### D4. Tabela semântica

`<table>` real: `<th scope="col">` para "Ariel" e "Isabella" (a célula superior esquerda fica vazia), `<th scope="row">` para "Proporção", "Pagou" e "Parte". Valores em centavos passam por `formatarMoeda`; a proporção é exibida como `60%`/`40%` (helper novo e pequeno em `formato.ts`, com teste em `frontend/test/formato.test.ts`; `textoProporcao` continua existindo, pois a tela de Proporção a usa). A linha "Proporção" usa `--texto-suave` por ser um parâmetro, não um resultado; "Pagou" e "Parte" usam peso 600.

A largura é a restrição real: em 320px sobram cerca de 256px dentro do painel. Primeira coluna com largura de conteúdo (o rótulo mais longo é "Proporção"), as duas colunas de pessoas dividem o resto, `white-space: nowrap` nos valores e tamanho de fonte de 1rem na tabela. O total usa `grid` simples acima da tabela, não `<dl>`.

O painel "Ciclo atual" deixa de usar `.linha`/`dl`, mas a classe `.linha` continua em uso no Histórico (`telas/historico.ts`); o CSS dela permanece e só o helper `linha()` de `telas/saldo.ts` é removido.

### D5. Remoções

Sai o botão `.sair` do cabeçalho (e sua regra CSS); sai o atalho `Proporção`, e `.atalhos` passa de 3 para 2 colunas. `telaSaldo(ctx, aoSair)` mantém a assinatura: `aoSair` é entregue ao item "Sair" do menu.

### D6. Casco do PWA

Como `sw.js` guarda o casco, subir `CACHE` de `contas-v2` para `contas-v3` para que as instalações existentes descartem o casco antigo (regra do `CLAUDE.md`).

## Risks / Trade-offs

- [Proporção e Sair ficam um toque mais longe] → É a intenção do pedido; ambos são usos raros. O menu abre no canto onde o botão já estava, então "Sair" não muda de região.
- [Valores grandes estourarem a tabela em 320px] → `nowrap`, fonte de 1rem e verificação manual com valores de 5 dígitos (ex.: R$ 12.345,67) a 320px, em claro e escuro.
- [`<dialog>` com backdrop transparente intercepta o toque seguinte] → Aceito: o primeiro toque fora só fecha o menu (comportamento esperado e igual ao de `confirmar()`).
- [Engrenagem sem texto é menos explícita que "Sair"] → `aria-label="Configurações"` e alvo de 48x48; o conteúdo do menu é texto.
- [O e2e atual quebra] → `roteiro.mjs` ganha um passo que abre o menu antes de "Proporção" e de "Sair" (tarefa dedicada).

## Migration Plan

Só frontend: `npm run deploy` (build, sync no S3, invalidação). Reversão: redeploy do commit anterior. Não há dados nem API envolvidos.
