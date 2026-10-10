# Contas da casa

App para Ariel e Isabella dividirem as contas: registram o que cada um pagou, e o app
calcula o saldo ("quem deve quanto a quem") sempre a partir do histórico.

- **frontend/**: PWA (Vite + TypeScript, sem framework), pensado para o celular.
- **backend/**: API em TypeScript (Lambda) e o domínio do ledger (`src/domain`).
- **infra/**: AWS CDK (DynamoDB, Lambda com Function URL, S3, CloudFront).
- **openspec/**: especificação e design (`openspec/changes/bill-split-pwa`).

```
Celular (PWA) -> CloudFront --- /*      -> S3 (app)
                           '--- /api/*  -> Lambda (Function URL) -> DynamoDB
```

## Desenvolvimento local

Precisa de Node 22+ e Docker (DynamoDB Local).

```bash
npm install
npm run db:local -w backend         # sobe o DynamoDB Local em 127.0.0.1:8000
npm test                            # backend, frontend e infra
npm run dev:api -w backend          # API em 127.0.0.1:8787 (usa a senha inicial padrão)
npm run dev -w frontend             # app em http://127.0.0.1:5173 (proxy /api -> 8787)
```

Roteiro de ponta a ponta no navegador (precisa de `npm run build -w frontend`,
`npx vite preview --port 4173` em `frontend/`, a API local numa **tabela nova** e um
Chromium; veja os cabeçalhos de `frontend/e2e/`): `npm run e2e`.

## Deploy

```bash
npm run deploy
```

Faz o build, o bootstrap do CDK (idempotente), o deploy, publica o site no S3, invalida o
CloudFront e inicializa a tabela (senha inicial padrão e proporção 50/50). Pode rodar de novo
para publicar uma versão nova. O endereço aparece no fim e em `cdk-outputs.json`.

O CloudFront fica no **plano gratuito de preço fixo** (US$ 0, sem cobrança de excedente);
`scripts/plano-gratuito.sh` faz a assinatura (e o CDK cria o WAF que o plano exige). Para
**remover** a stack, cancele antes o plano da distribuição, porque uma distribuição com plano
não pode ser excluída: `aws pricing-plan-manager cancel-subscription` (planos Free cancelam
na hora).

A tabela do DynamoDB tem proteção contra exclusão e é mantida mesmo se a stack for
destruída (`cdk destroy`); para apagá-la de vez, remova a proteção e a tabela à mão.

## Trocar a senha

A senha (única, dos dois) fica no item `CONFIG/main` como `sha256(senha + salt)`:

```bash
TABELA=<nome da tabela, em cdk-outputs.json>
SALT=$(openssl rand -hex 8)
HASH=$(printf '%s' "NOVA_SENHA$SALT" | sha256sum | cut -d' ' -f1)
aws dynamodb update-item --table-name "$TABELA" \
  --key '{"pk":{"S":"CONFIG"},"sk":{"S":"main"}}' \
  --update-expression 'SET salt = :s, #h = :h' \
  --expression-attribute-names '{"#h":"hash"}' \
  --expression-attribute-values "{\":s\":{\"S\":\"$SALT\"},\":h\":{\"S\":\"$HASH\"}}"
```

Trocar a senha **não** desloga ninguém: os tokens duram 3650 dias. Para invalidar todos os
tokens (por exemplo, celular perdido), troque o `jwtSecret` do mesmo item por um valor
novo e aleatório (`openssl rand -base64 32`); vale em até 5 minutos, que é o tempo que a
Lambda guarda o segredo.
