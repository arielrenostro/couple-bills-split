## Why

Os depósitos na conta conjunta costumam ser em valores redondos (de R$ 1.000 a R$ 10.000). Digitar o valor na calculadora para cada caso é um passo que dá para eliminar: com os valores mais comuns já calculados na tela, a pessoa só olha a linha e transfere.

## What Changes

- A tela de Depósito ganha uma **tabela de valores prontos** abaixo do resultado, com as colunas **Valor total**, **Ariel** e **Isabella** e dez linhas: R$ 1.000, 2.000, 3.000, até 10.000.
- As partes de cada linha seguem a **proporção vigente**, a mesma usada pela calculadora, e a tabela já aparece preenchida ao abrir a tela, sem digitar nada.
- Os valores aparecem com o símbolo "R$" e duas casas decimais (por exemplo, "R$ 1.000,00"), no mesmo formato do resultado da calculadora. Para as três colunas caberem em telas de 320px, a fonte da tabela diminui nas telas estreitas.
- A tabela é fixa: a lista de valores não é configurável, e tocar numa linha não faz nada. A calculadora continua igual (campo de valor e resultado).

Sem mudanças na API, no domínio ou nos dados: a tabela é calculada no aparelho com a proporção que a tela já tem.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pwa-ui`: novo requisito "Tabela de depósitos padrão". O requisito "Calculadora de depósito" não muda.

## Impact

- Código: `frontend/src/deposito.ts` (função pura que monta as linhas), `frontend/src/telas/deposito.ts` (a tabela, formatada com o `formatarMoeda` existente) e `frontend/src/estilos.css`.
- Testes: `frontend/test/deposito.test.ts`; passo novo no `frontend/e2e/roteiro.mjs`.
- PWA: `frontend/public/sw.js` (`CACHE`) e o nome do cache fixo em `frontend/e2e/pwa.mjs`.
- Backend, infra, DynamoDB e specs `ledger` e `auth`: sem mudança.
- Fora de escopo: lista de valores editável, tocar numa linha para preencher o campo, valores acima de R$ 10.000 ou outros degraus, guardar qualquer coisa no aparelho.
