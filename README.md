# Contas da casa (household bills)

An app for a couple to split their shared bills: each one records what they paid,
and the app works out the balance ("who owes whom") always from the history.

- **frontend/**: PWA (Vite + TypeScript, no framework), designed for the phone.
- **backend/**: TypeScript API (Lambda) and the ledger domain (`src/domain`).
- **infra/**: AWS CDK (DynamoDB, Lambda with Function URL, S3, CloudFront).
- **openspec/**: specification and design (`openspec/changes/bill-split-pwa`).

```
Phone (PWA) -> CloudFront --- /*      -> S3 (app)
                         '--- /api/*  -> Lambda (Function URL) -> DynamoDB
```

## Local development

Requires Node 22+ and Docker (DynamoDB Local).

```bash
npm install
npm run db:local -w backend         # starts DynamoDB Local on 127.0.0.1:8000
npm test                            # backend, frontend and infra
npm run dev:api -w backend          # API on 127.0.0.1:8787 (uses the default initial password)
npm run dev -w frontend             # app on http://127.0.0.1:5173 (proxies /api -> 8787)
```

End-to-end script in the browser (needs `npm run build -w frontend`,
`npx vite preview --port 4173` inside `frontend/`, the local API on a **fresh table**, and a
Chromium; see the headers of the files in `frontend/e2e/`): `npm run e2e`.

## Deploy

```bash
npm run deploy
```

It builds, bootstraps CDK (idempotent), deploys, publishes the site to S3, invalidates
CloudFront and initializes the table (default initial password and a 50/50 split). It can be
run again to publish a new version. The address is printed at the end and written to
`cdk-outputs.json`.

CloudFront runs on the **free flat-rate plan** (US$ 0, no overage charges);
`scripts/plano-gratuito.sh` creates the subscription (and CDK creates the WAF the plan
requires). To **remove** the stack, first cancel the distribution's plan, because a
distribution that has a plan can't be deleted: `aws pricing-plan-manager cancel-subscription`
(Free plans are cancelled immediately).

The DynamoDB table has deletion protection and is kept even if the stack is destroyed
(`cdk destroy`); to delete it for good, remove the protection and the table by hand.

## Changing the password

The password (a single one, shared by both) is stored in the `CONFIG/main` item as
`sha256(password + salt)`:

```bash
TABLE=<table name, from cdk-outputs.json>
SALT=$(openssl rand -hex 8)
HASH=$(printf '%s' "NEW_PASSWORD$SALT" | sha256sum | cut -d' ' -f1)
aws dynamodb update-item --table-name "$TABLE" \
  --key '{"pk":{"S":"CONFIG"},"sk":{"S":"main"}}' \
  --update-expression 'SET salt = :s, #h = :h' \
  --expression-attribute-names '{"#h":"hash"}' \
  --expression-attribute-values "{\":s\":{\"S\":\"$SALT\"},\":h\":{\"S\":\"$HASH\"}}"
```

Changing the password does **not** sign anyone out: tokens last 3650 days. To invalidate all
tokens (for example, a lost phone), replace the `jwtSecret` of the same item with a new
random value (`openssl rand -base64 32`); it takes effect within 5 minutes, which is how long
the Lambda caches the secret.
