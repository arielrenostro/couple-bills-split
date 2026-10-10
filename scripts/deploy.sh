#!/usr/bin/env bash
# Deploy completo: infraestrutura (CDK), site estático (S3 + CloudFront) e
# inicialização da tabela (senha "batman", proporção 50/50). Idempotente:
# pode rodar de novo para publicar uma versão nova.
#
#   npm run deploy
#
# Usa as credenciais AWS do ambiente (ex.: `aws login`).
set -euo pipefail
cd "$(dirname "$0")/.."

SAIDAS="cdk-outputs.json"

echo "==> Conta e região"
CONTA="$(aws sts get-caller-identity --query Account --output text)"
REGIAO="${AWS_REGION:-${AWS_DEFAULT_REGION:-$(aws configure get region)}}"
echo "    conta ${CONTA}, região ${REGIAO}"

echo "==> Build do frontend"
npm run build -w frontend

echo "==> Bootstrap do CDK (idempotente)"
(cd infra && npx cdk bootstrap "aws://${CONTA}/${REGIAO}" --quiet)

echo "==> Deploy da infraestrutura"
(cd infra && npx cdk deploy --require-approval never --outputs-file "../${SAIDAS}" ContasDaCasa)

echo "==> Plano gratuito do CloudFront (preço fixo)"
bash scripts/plano-gratuito.sh

saida() { node -e "console.log(require('./${SAIDAS}').ContasDaCasa['$1'])"; }
BUCKET="$(saida NomeDoBucket)"
DISTRIBUICAO="$(saida DistribuicaoId)"
TABELA="$(saida NomeDaTabela)"
ENDERECO="$(saida Endereco)"

echo "==> Publicando o site em s3://${BUCKET}"
# Arquivos com hash no nome nunca mudam: cache longo.
aws s3 sync frontend/dist/assets "s3://${BUCKET}/assets" --delete \
  --cache-control "public,max-age=31536000,immutable"
# O resto (index.html, sw.js, manifest, ícones) precisa ser revalidado sempre.
aws s3 sync frontend/dist "s3://${BUCKET}" --delete --exclude "assets/*" \
  --cache-control "no-cache"

echo "==> Invalidando o cache do CloudFront"
aws cloudfront create-invalidation --distribution-id "${DISTRIBUICAO}" \
  --paths "/" "/index.html" "/sw.js" "/manifest.webmanifest" --query "Invalidation.Id" --output text

echo "==> Inicializando a tabela ${TABELA}"
npx tsx infra/scripts/inicializar.ts --tabela "${TABELA}"

echo
echo "Pronto: ${ENDERECO}"
echo "Entre como ariel ou isabella com a senha inicial. TROQUE A SENHA (veja o README)."
