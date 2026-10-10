## Why

Ariel e Isabella dividem as contas mensais da casa em proporções que mudam, e hoje o controle de quem pagou o quê e de quanto um deve ao outro é manual. Um app pequeno, usado no celular, com formulários de entrada estruturada, deixa o registro sem ambiguidade e o saldo sempre calculado, dentro de um custo zero (ou centavos).

## What Changes

- Novo backend serverless (AWS Lambda com Function URL) com persistência em DynamoDB.
- Novo frontend PWA, mobile-first, hospedado em S3 e servido por CloudFront na mesma origem da API (`/api/*` roteado para a Lambda), sem API Gateway e sem CORS.
- Login simples: escolha entre `ariel` e `isabella` com uma senha única compartilhada (padrão `batman`), armazenada como `sha256(senha + salt)` em um item único de configuração no DynamoDB, junto com o segredo de assinatura do JWT.
- Sessão por JWT (HS256) com validade de 3650 dias; rotacionar o segredo invalida todos os tokens.
- Histórico de lançamentos de três tipos: `despesa`, `acerto` ("paguei") e `proporcao`. O saldo é sempre calculado a partir do histórico, sem compilado.
- Conceito de ciclo: uma conta fica "em aberto" até que um acerto leve o saldo exatamente a zero; ao zerar, o ciclo fecha e nunca reabre.
- Mudança de proporção é um lançamento visível no histórico, com preview de saldo antes e depois, e reaplica-se às despesas do ciclo aberto que não têm proporção customizada.
- Telas: Saldo (inicial, com botão de adicionar em destaque), Compra, Histórico (cards com saldo acumulado) e Proporção.
- Confirmação obrigatória para remover um lançamento e para registrar "paguei"; a mudança de proporção exige o passo de preview. Registrar uma compra não pede confirmação.

## Capabilities

### New Capabilities
- `auth`: login com usuário (`ariel` ou `isabella`) e senha única, hash com salt no DynamoDB, emissão e validação de JWT de longa duração.
- `ledger`: lançamentos de despesa, acerto e proporção, ciclos abertos e fechados, cálculo de saldo e saldo acumulado, remoção, regras de data.
- `pwa-ui`: telas mobile-first, instalação como PWA, fluxo de confirmações, cards do histórico.

### Modified Capabilities
<!-- Nenhuma: projeto novo, sem specs existentes. -->

## Impact

- Projeto novo, sem código existente.
- Infraestrutura: S3, CloudFront (com a Lambda Function URL como origem de `/api/*`), Lambda, DynamoDB. Sem API Gateway.
- Custo esperado: centavos no pior caso com dois usuários. O risco de "grátis" depende da idade da conta AWS (créditos que expiram para contas criadas após 15/07/2025).
- Fora de escopo: notificações push, modo offline com fila, lançamentos com data retroativa anterior ao último fechamento, edição de lançamentos (apenas remoção).
