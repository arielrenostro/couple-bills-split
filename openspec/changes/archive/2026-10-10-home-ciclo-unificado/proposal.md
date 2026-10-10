## Why

A home mostra a mesma história em dois painéis com hierarquias que se contradizem: o card verde "Saldo" fica acima do título "Ciclo atual", embora o saldo seja uma propriedade do ciclo. Os três atalhos espremidos em uma linha (um deles, "Paguei", é a ação mais importante depois de adicionar conta) completam a impressão de tela montada por acréscimos. Falta também uma informação que o casal já pergunta: a divisão que de fato aconteceu no ciclo quando há contas com proporção customizada.

## What Changes

- O card "Saldo" **é removido**. O painel "Ciclo atual" passa a ser o primeiro bloco da tela e traz, lado a lado no topo, duas métricas: **"Total das contas"** e **"{Fulano} deve"** (o nome de quem deve, com o valor logo abaixo, sem "ao/à {Sicrano}", porque são só duas pessoas). O valor da dívida usa a cor de acento; o total fica neutro.
- Sem dívida, a métrica da direita mostra **"Quites"** com **R$ 0,00** em tom suave. A frase "Ninguém deve nada" deixa de existir na home.
- As duas métricas ficam em uma linha que **quebra**: se não couberem lado a lado (valores grandes, tela de 320px), a dívida desce para baixo do total. O tamanho do valor e as margens do painel diminuem um pouco; não se usa `clamp()`.
- A tabela do ciclo ganha a linha **"Efetiva"** entre "Proporção" e "Pagou": a parte de cada pessoa dividida pelo total das contas do ciclo, com no máximo uma casa decimal (`60%`, `58,3%`) e "—" quando o ciclo não tem contas. Difere de "Proporção" quando há contas com proporção customizada.
- Os botões passam a ser, de cima para baixo: **"+ Adicionar conta"**, **"Adicionar acerto"** (antigo "Paguei", mesma largura total e desabilitado sem dívida) e, numa linha de duas colunas, **"Histórico"** e **"Depósito"**.
- A tela do acerto passa a se chamar **"Adicionar acerto"** (hoje o título é "Paguei"), para o botão e a tela não divergirem.

Sem mudança na API, no domínio ou nos dados: a proporção efetiva é calculada no aparelho a partir de `parte` e `totalDespesas`, que `GET /api/saldo` já devolve.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pwa-ui`: os requisitos "Tela de Saldo como inicial" (estrutura da home, métrica da dívida, linha "Efetiva", botões) e "Confirmações" (o cenário de cancelar cita o botão renomeado) mudam.

## Impact

- Código: `frontend/src/telas/saldo.ts` (nova estrutura), `frontend/src/telas/acerto.ts` (título), `frontend/src/estilos.css` (painel, métricas, botões; remove `.saldo-principal`) e uma função pura nova para a proporção efetiva em `frontend/src/` com teste em `frontend/test/`. `fraseSaldo` continua em `formato.ts`, porque o histórico e a tela de proporção ainda usam `fraseSaldoAssinado`.
- Testes: `frontend/e2e/roteiro.mjs` (cerca de 15 asserções leem `.frase-saldo` com a frase inteira, e há cliques em "Paguei") e `frontend/e2e/pwa.mjs` (espera `.frase-saldo`).
- PWA: subir `CACHE` em `frontend/public/sw.js` e o nome do cache fixo em `frontend/e2e/pwa.mjs`.
- Backend, infra, DynamoDB e specs `ledger` e `auth`: sem mudança.
- Fora de escopo: mudar a paleta ou a tipografia do app, mudar o histórico ou a tela de proporção, acessibilidade extra para a frase de saldo (decisão explícita: não é necessária), qualquer alteração de regra do ledger.
