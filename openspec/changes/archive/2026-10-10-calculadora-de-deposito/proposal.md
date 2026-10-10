## Why

De vez em quando o casal precisa colocar dinheiro na conta conjunta para pagar contas no débito, e cada um deve entrar com a sua parte, na mesma proporção que o app já usa para dividir as contas. Hoje isso é feito na calculadora do celular, abrindo o app para lembrar a proporção, digitando-a à mão e arredondando de cabeça.

## What Changes

- Novo botão **Depósito** na tela de Saldo, que abre uma tela de calculadora.
- Na calculadora, a pessoa informa o **valor total a depositar** e o app mostra, enquanto ela digita, **quanto cada um deposita** (Ariel e Isabella), usando a proporção vigente. Não há botão de calcular.
- A soma das duas partes é sempre exatamente o valor informado; quando a divisão deixa um centavo quebrado, ele fica com o Ariel (regra fixa, para os dois celulares mostrarem o mesmo resultado).
- É só uma calculadora: nada é gravado, nem na API, nem no histórico, nem no aparelho. O depósito não afeta saldo, ciclo ou proporção.

Sem mudanças na API, no domínio ou nos dados: `GET /api/saldo` já devolve a proporção vigente.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pwa-ui`: novo requisito "Calculadora de depósito" (acesso pela tela de Saldo, cálculo pela proporção vigente, arredondamento, e a garantia de que nada é gravado) e ajuste de "Tela de Saldo como inicial", cujo cenário "Sem atalho de Proporção" dizia que os atalhos eram *apenas* "Paguei" e "Histórico"; agora inclui também "Depósito".

## Impact

- Código: nova tela `frontend/src/telas/deposito.ts`, função pura de divisão em `frontend/src/deposito.ts`, rota `/deposito` em `frontend/src/main.ts`, botão em `frontend/src/telas/saldo.ts` e estilos em `frontend/src/estilos.css`.
- Testes: teste unitário da divisão em `frontend/test/`; passo novo em `frontend/e2e/roteiro.mjs`.
- PWA: `frontend/public/sw.js` precisa de `CACHE` novo em relação ao que está publicado (ver tarefas).
- Backend, infra, DynamoDB e specs `ledger` e `auth`: sem mudança.
- Fora de escopo: guardar ou lembrar depósitos, calcular o sentido inverso (dado o que um já depositou, quanto falta ao outro), usar uma proporção diferente da vigente, qualquer funcionamento offline.
