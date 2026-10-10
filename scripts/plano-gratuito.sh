#!/usr/bin/env bash
# Assina a distribuição do CloudFront no plano gratuito de preço fixo (US$ 0, 1 milhão
# de requisições e 100 GB por mês, sem cobrança de excedente). Idempotente.
#
# Pré-requisito: a stack já foi implantada com a Web ACL do WAF associada à
# distribuição (o plano exige) e `cdk-outputs.json` existe (veja scripts/deploy.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

SAIDAS="cdk-outputs.json"
saida() { node -e "console.log(require('./${SAIDAS}').ContasDaCasa['$1'])"; }
DISTRIBUICAO_ARN="$(saida DistribuicaoArn)"
WAF_ARN="$(saida WafArn)"

EXISTENTE="$(aws pricing-plan-manager list-subscriptions \
  --query "subscriptionSummaries[?contains(resourceArns, '${DISTRIBUICAO_ARN}')].arn | [0]" \
  --output text)"

if [ -n "${EXISTENTE}" ] && [ "${EXISTENTE}" != "None" ]; then
  echo "    distribuição já está no plano gratuito (${EXISTENTE})"
  exit 0
fi

echo "    assinando o plano gratuito do CloudFront para ${DISTRIBUICAO_ARN}"
aws pricing-plan-manager create-subscription \
  --plan-family CloudFront --plan-tier FREE \
  --resource-arns "${DISTRIBUICAO_ARN}" "${WAF_ARN}" >/dev/null

# A ativação leva alguns segundos (SYNC_IN_PROGRESS -> ACTIVE).
aws pricing-plan-manager list-subscriptions \
  --query "subscriptionSummaries[?contains(resourceArns, '${DISTRIBUICAO_ARN}')].[status,planTier]|[0]" \
  --output text
