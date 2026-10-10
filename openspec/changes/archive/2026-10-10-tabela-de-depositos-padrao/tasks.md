## 1. Cálculo e formato

- [x] 1.1 Em `frontend/src/formato.ts`, criar `formatarReais(centavos)` (milhar pt-BR, sem casas quando inteiro, duas casas quando não) e cobri-lo em `frontend/test/formato.test.ts` com 100000 → "1.000", 60000 → "600", 1000000 → "10.000", 150 → "1,50"; verificar com `npm test -w frontend`
- [x] 1.2 Em `frontend/src/deposito.ts`, criar `VALORES_PADRAO` (1.000 a 10.000 reais, em centavos) e `tabelaDePadroes(proporcao)` (usa `dividirDeposito`), e cobri-la em `frontend/test/deposito.test.ts`: 10 linhas em ordem; a 60/40, primeira 1000/600/400 reais e última 10000/6000/4000; a 70/30, 3000 → 2100 e 900; em todas as linhas e proporções 0..100, `ariel + isabella === total`; verificar com `npm test -w frontend`

## 2. Tela

- [x] 2.1 Em `frontend/src/telas/deposito.ts`, montar a `<table>` num `.painel` depois do painel de resultado, com `<caption>` "Valores prontos, em R$", `th scope="col"` ("Valor total", "Ariel", "Isabella") e `th scope="row"` com o valor total de cada linha, usando `tabelaDePadroes` e `formatarReais`; verificar com `npm run typecheck -w frontend` e no navegador que a tabela aparece preenchida ao abrir, com a proporção vigente, e não muda ao digitar no campo
- [x] 2.2 Estilos da tabela em `frontend/src/estilos.css` (1rem, `tabular-nums`, números à direita, `nowrap`, valor total e cabeçalhos em `--texto-suave`, partes em peso 600, linhas finas de `--borda`, sem zebra; só variáveis existentes); verificar a 320px e a 480px, em claro e escuro, sem rolagem horizontal, incluindo a linha de 10.000

## 3. Testes e entrega

- [x] 3.1 Acrescentar ao passo do depósito em `frontend/e2e/roteiro.mjs`: a tabela tem 10 linhas e os cabeçalhos "Valor total", "Ariel", "Isabella"; a 60/40 a primeira linha é 1.000/600/400 e a última 10.000/6.000/4.000; ao digitar no campo as células da tabela não mudam; sem rolagem horizontal; rodar contra `vite preview` e a API local em **tabela nova**, nunca contra o site publicado
- [x] 3.2 Subir `CACHE` em `frontend/public/sw.js` para a próxima versão em relação ao valor atual e atualizar o nome fixo em `frontend/e2e/pwa.mjs` para o mesmo valor; rodar `node frontend/e2e/pwa.mjs` e verificar que passa
- [x] 3.3 Rodar `npm run typecheck -w frontend`, `npm test`, `npm run build` e `openspec validate tabela-de-depositos-padrao --strict`; todos devem passar

## 4. Ajuste: "R$" e duas casas nas células

- [x] 4.1 Trocar `formatarReais` por `formatarMoeda` nas células de `frontend/src/telas/deposito.ts` (caption "Valores prontos"), remover `formatarReais` de `frontend/src/formato.ts` e seus testes de `frontend/test/formato.test.ts`; verificar com `npm run typecheck -w frontend` e `npm test -w frontend`
- [x] 4.2 Em `frontend/src/estilos.css`, reduzir o padding lateral do painel da tabela para 12px e usar `clamp(0.78rem, 3.6vw, 1rem)` na fonte da tabela; verificar a 320px, 390px e 480px, claro e escuro, sem rolagem horizontal e com "R$ 10.000,00" inteiro na linha
- [x] 4.3 Atualizar o passo do depósito em `frontend/e2e/roteiro.mjs` para os novos textos ("R$ 1.000,00", "R$ 600,00", "R$ 400,00"; última linha "R$ 10.000,00", "R$ 6.000,00", "R$ 4.000,00"; caption sem "em R$"); rodar em **tabela nova**
- [x] 4.4 Subir `CACHE` em `frontend/public/sw.js` e o nome fixo em `frontend/e2e/pwa.mjs` para a próxima versão (`contas-v6`) e rodar `pwa.mjs`; rodar `npm run typecheck -w frontend`, `npm test`, `npm run build` e `openspec validate tabela-de-depositos-padrao --strict`

