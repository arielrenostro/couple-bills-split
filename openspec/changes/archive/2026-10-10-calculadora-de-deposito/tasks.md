## 1. Cálculo

- [x] 1.1 Criar `frontend/src/deposito.ts` com `dividirDeposito(total, proporcao)` (Ariel arredondado meio para cima, Isabella o restante) e `frontend/test/deposito.test.ts` cobrindo: 100000 a 60/40 (60000 e 40000), 10001 a 50/50 (5001 e 5000), 10001 a 33/67 (3300 e 6701), 100% para um lado (0 e total), 1 centavo e a soma sempre igual ao total; verificar com `npm test -w frontend`

## 2. Tela

- [x] 2.1 Criar `frontend/src/telas/deposito.ts`: `topo("Depósito", voltar)`, linha de ajuda, campo "Valor total (R$)" (`inputMode: "decimal"`, foco ao abrir), painel com as linhas Ariel/Isabella (nome, percentual, valor), carregando a proporção com `obterSaldo()` e `caixaDeErro` com tentar de novo, `aria-live="polite"` no resultado, "—" com valor vazio e "Informe um valor maior que zero." com texto inválido; verificar com `npm run typecheck -w frontend` e no navegador digitando "1000", "1.000,50", "abc" e apagando o campo
- [x] 2.2 Registrar a rota `/deposito` em `frontend/src/main.ts` e acrescentar o botão "Depósito" aos atalhos de `frontend/src/telas/saldo.ts`, passando `.atalhos` para 3 colunas em `estilos.css`; verificar que a home mostra Paguei, Histórico e Depósito lado a lado e que o botão abre a calculadora
- [x] 2.3 Estilos do painel de partes em `frontend/src/estilos.css` (valores a ~1,6rem, peso 750, `tabular-nums`, à direita e `nowrap`; nome e percentual à esquerda; linha fina de `--borda` entre as pessoas; só variáveis existentes); verificar a 320px e a 480px, em claro e escuro, com R$ 123.456,78 sem rolagem horizontal, e com foco de teclado visível no campo e nos atalhos

## 3. Testes e entrega

- [x] 3.1 Acrescentar a `frontend/e2e/roteiro.mjs` um passo que abre "Depósito", digita 1000 com a proporção vigente e confere as duas partes, volta e confere que o saldo e a contagem de lançamentos do histórico não mudaram; rodar contra `vite preview` e a API local em **tabela nova**, nunca contra o site publicado
- [x] 3.2 Conferir que `frontend/e2e/pwa.mjs` continua passando (somente leitura) e que a home tem os 3 atalhos
- [x] 3.3 Subir `CACHE` em `frontend/public/sw.js` para a próxima versão em relação ao HEAD (`contas-v3`), a menos que `git diff` mostre que ele já foi subido nesta árvore e ainda não publicado por outra mudança; verificar o diff
- [x] 3.4 Rodar `npm run typecheck -w frontend`, `npm test` e `npm run build`; todos devem passar
- [x] 3.5 Rodar `openspec validate calculadora-de-deposito --strict` e conferir que o cenário "Sem atalho de Proporção" do delta lista "Paguei", "Histórico" e "Depósito"

## 4. Proporção vinda da tela de Saldo

- [x] 4.1 Criar `frontend/src/proporcaoVigente.ts` (guardar, ler e esquecer, só em memória), chamar `lembrarProporcao` em `telas/saldo.ts` ao carregar o saldo e `esquecerProporcao` em `encerrarSessao`; verificar com `npm run typecheck -w frontend`
- [x] 4.2 Em `telas/deposito.ts`, abrir direto com a proporção guardada (sem carregando e sem `obterSaldo`) e só buscar quando não houver, guardando o resultado; verificar no navegador que abrir "Depósito" pela home não gera requisição a `/api/saldo` e que recarregar em `#/deposito` ainda funciona
- [x] 4.3 Em `e2e/roteiro.mjs`, contar as requisições a `/api/saldo` ao abrir o Depósito pela home (esperado 0) e acrescentar o passo de abertura direta por recarga (esperado 1 requisição e as partes corretas); rodar em **tabela nova**, junto com `pwa.mjs`, `npm run typecheck -w frontend`, `npm test`, `npm run build` e `openspec validate calculadora-de-deposito --strict`
