# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

App for a couple to split shared bills ("Contas da casa"): a PWA (S3 + CloudFront) calling a Lambda API backed by DynamoDB. The GitHub repo is `couple-bills-split`; the local folder is still called `telegram-billing-group` (a stale name from an abandoned chat-bot idea; there is no bot, no LLM). Identifiers, comments, UI text and OpenSpec artifacts are in **Portuguese (pt-BR)**; keep that convention.

## Commands

npm workspaces monorepo (`backend`, `frontend`, `infra`), Node 22+. There is no linter or formatter configured.

```bash
npm install
npm run db:local -w backend          # DynamoDB Local in Docker, 127.0.0.1:8000 (needed by backend tests)
npm test                             # all workspaces
npm run typecheck -w backend         # also: -w frontend, -w infra (tests are type-checked here, not by the build)
npm run build                        # all workspaces

npm test -w backend -- test/domain/ledger.test.ts      # one test file
npm test -w backend -- -t "acerto parcial"             # one test by name
npm run dev:api -w backend           # local API on :8787 (creates + seeds table "contas-dev")
npm run dev -w frontend              # Vite on :5173, proxies /api -> :8787
npm run synth -w infra               # cdk synth
npm run deploy                       # scripts/deploy.sh: build, CDK deploy, S3 sync, invalidation, seed
```

Backend tests under `test/dados`, `test/api` and `test/auth` hit DynamoDB Local; they fail with an explicit "DynamoDB Local indisponível" message when the container is down. Each test file creates its own uniquely named table.

Browser E2E (`npm run e2e`, Playwright-core with a cached headless Chromium, see headers of `frontend/e2e/*.mjs`) needs `vite preview` on :4173 plus the local API **on a fresh table** (`--tabela <new name>`): `roteiro.mjs` writes data and closes a cycle. **Never run `roteiro.mjs` against the deployed site**; `pwa.mjs` is read-only and safe there.

## Architecture

```
PWA -> CloudFront --- /*     -> S3 (private, OAC)
                  '-- /api/* -> Lambda Function URL (public) -> DynamoDB
```

### The ledger domain (`backend/src/domain`, pure functions, no AWS, no clock)

Everything important lives here and is spread over several files. The core rule: **the balance is never stored; it is recomputed from the full history on every read** (`ledger.ts: calcular`).

- Three entry types: `despesa` (bill), `acerto` ("paguei", a payment between them), `proporcao` (split change). All money is integer **centavos**, splits are integer percentages summing to 100.
- Balance sign convention: positive = Isabella owes Ariel, negative = Ariel owes Isabella. The UI never shows negatives (`descreverSaldo`).
- Entries are ordered by `(data, id)`; ids are time-sortable (`dados/id.ts`), so ties resolve by creation order.
- **Cycles are derived, not stored**: the open cycle is everything since the last `acerto` that brought the balance to exactly zero. Only an `acerto` can close a cycle; partial or overshooting payments do not. A closed cycle never reopens, and its entries (including the closing acerto) cannot be removed or backdated into (`validacao.ts`).
- Split semantics: a `despesa` with `proporcao: null` uses the current default split, and a split change retroactively applies to **all** default-split bills of the *open* cycle; custom-split bills and closed cycles are untouched. The default split in force at the end of a cycle is what freezes it.
- Known subtlety (documented in the archived design, D4): each card's `saldoAcumulado` uses the split in force *at that point in time*, while a bill's displayed shares use the split in force at the end of its cycle, so they can look inconsistent after a split change.
- The payer's share is the remainder, the non-payer's share is rounded, so shares always sum exactly to the total (`divisao.ts`).
- Because cycles are derived, any write to the open cycle (backdated bill, removal) can make an existing partial acerto hit zero and close the cycle retroactively. This is accepted behavior, not a bug.

### Backend layering

`lambda.ts` (wiring) -> `api/rotas.ts` (single router, takes dependencies as an object, so tests call it directly with Function-URL-shaped events) -> `auth/`, `dados/`, `domain/`. Writes always re-read the whole ledger and validate through `domain/validacao.ts` before persisting; there is no aggregate table.

DynamoDB single table, keys `pk`/`sk`: item `CONFIG/main` holds `{salt, hash, jwtSecret, inicializadoEm}`; ledger items are `LEDGER` / `<data>#<id>`. The JWT secret is created lazily with `if_not_exists` (race-safe); `repositorio.inicializar` seeds password + first 50/50 `proporcao` in one idempotent transaction (`semente.ts`, run by the deploy script, never by the Lambda).

Auth: one shared password (`sha256(password + salt)`, constant-time compare), user picks `ariel` or `isabella`, HS256 JWT valid 3650 days sent as `Authorization: Bearer`. Rotating `jwtSecret` in the table invalidates every token (the Lambda caches the secret for 5 minutes). Login has no rate limiting.

### Frontend (`frontend/src`)

Vanilla TypeScript, no framework: hash router in `main.ts`, one function per screen in `telas/` returning a DOM node, `ui/dom.ts: h()` builds elements and only ever inserts text nodes (user text must not go through `innerHTML`). Token and user live in `localStorage` (`sessao.ts`). Confirmation dialogs are required for removing an entry and for "Paguei"; registering a bill needs none; changing the split goes through a preview screen. `public/sw.js` caches only the app shell and never `/api/*`; **bump `CACHE` in `sw.js` when shipping shell changes you want existing installs to drop**. Icons are generated by `node frontend/scripts/icones.mjs`.

### Infra (`infra/src/stack.ts`)

Constraints that look arbitrary but are deliberate (rationale in `openspec/changes/archive/2026-10-10-bill-split-pwa/design.md`, D1 and D8):

- The Lambda Function URL is **public on purpose**; OAC was rejected because it forces the browser to send `x-amz-content-sha256` on POST and overrides `Authorization`. The JWT is the only barrier.
- CloudFront is on the **Free flat-rate plan**, created by `scripts/plano-gratuito.sh` via `pricing-plan-manager`. It requires `PriceClass_All` (the API rejects the distribution as "not eligible" with `PriceClass_100`), a WAF Web ACL (defined in the CDK so deploys don't detach it) and only AWS-*managed* cache / origin-request / response-header policies. A distribution under a plan cannot be deleted until its subscription is cancelled.
- The DynamoDB table has deletion protection and `RETAIN`; the S3 bucket uses `autoDeleteObjects` (which is why a second, helper Lambda exists in the stack).

`cdk-outputs.json` and `infra/cdk.out/` contain the AWS account id, CloudFront domain, bucket and table names. They are git-ignored; keep it that way and never copy those values into tracked files.

## Specs

OpenSpec (`spec-driven` schema) is the source of truth for behavior: `openspec/specs/{auth,ledger,pwa-ui}` hold the current requirements, and the finished change with proposal, design and tasks is in `openspec/changes/archive/`. Artifacts are written in pt-BR with English structural headings and `SHALL`/`MUST` keywords (see `openspec/config.yaml`). New work goes through `/opsx:propose` or `/opsx:explore`; run `openspec validate <name> --strict` before archiving.

## Pitfalls

- The initial password is a hard-coded default in `backend/src/dados/semente.ts` and appears in tests and specs; the deployed value is meant to be changed by hand in the table (recipe in `README.md`).
- `pkill -f <pattern>` run from a Bash tool call can match and kill its own shell; stop local servers by PID/port instead.
