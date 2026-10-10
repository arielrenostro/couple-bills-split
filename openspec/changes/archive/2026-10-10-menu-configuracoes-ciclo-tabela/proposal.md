## Why

A tela de Saldo mistura ações do dia a dia ("Adicionar conta", "Paguei", "Histórico") com ações raras ("Proporção", "Sair"), que ocupam espaço e ficam lado a lado com as principais. Além disso, o painel "Ciclo atual" é uma lista de seis linhas em que é preciso ler cada rótulo ("Ariel pagou", "Parte da Isabella") para comparar as duas pessoas; uma tabela com uma coluna por pessoa torna a comparação imediata.

## What Changes

- Novo botão de configurações (engrenagem) no canto superior direito do cabeçalho da tela de Saldo. Ao tocar, abre um menu com duas opções: **Proporção** (vai para a tela de Proporção, como hoje) e **Sair** (encerra a sessão, como hoje).
- O botão de texto "Sair" do cabeçalho é removido; passa a existir só dentro do menu.
- O atalho "Proporção" é removido da fileira de atalhos da home, que fica com **Paguei** e **Histórico**.
- O painel "Ciclo atual" é reorganizado: primeiro o **valor total das contas** em destaque, depois uma **tabela** com as colunas "Ariel" e "Isabella" e as linhas "Proporção", "Pagou" e "Parte". A lista atual de seis linhas deixa de existir.
- A direção visual (feita com a skill frontend-design) mantém a identidade atual do app (verde-azulado, tipografia do sistema, painéis arredondados) e investe o cuidado extra em dois pontos: o total como número principal do painel e a tabela com números alinhados, legível em tela estreita. Detalhes em `design.md`.

Sem mudanças na API, no domínio ou nos dados: a resposta de `GET /api/saldo` já traz tudo o que a tabela precisa.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pwa-ui`: o requisito "Tela de Saldo como inicial" muda (a Proporção deixa de ser um acesso direto da tela e o ciclo aberto passa a ser exibido como total + tabela); entra um novo requisito para o menu de configurações com "Proporção" e "Sair".

## Impact

- Código: `frontend/src/telas/saldo.ts` (cabeçalho, atalhos, painel do ciclo), novo componente do menu em `frontend/src/ui/` (ícone de engrenagem exige SVG; `h()` hoje só cria elementos HTML), `frontend/src/estilos.css` (menu, tabela, total), `frontend/public/sw.js` (subir `CACHE` para as instalações existentes receberem o novo casco).
- Testes: `frontend/e2e/roteiro.mjs` navega para a Proporção pelo botão da home e sai pelo botão "Sair" do cabeçalho; ambos passam a abrir o menu antes. `frontend/test/` não cobre a tela de Saldo.
- Specs: delta em `openspec/specs/pwa-ui`.
- Backend, infra, API e autenticação: sem alteração.
