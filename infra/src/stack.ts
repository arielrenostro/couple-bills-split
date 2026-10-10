import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import type { Construct } from "constructs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const ENTRADA_LAMBDA = path.resolve(aqui, "../../backend/src/lambda.ts");

export class ContasStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Dados financeiros: a tabela sobrevive a um `cdk destroy`.
    const tabela = new dynamodb.Table(this, "Tabela", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const api = new NodejsFunction(this, "Api", {
      entry: ENTRADA_LAMBDA,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(10),
      environment: { TABELA: tabela.tableName },
      bundling: { minify: true, sourceMap: false, target: "node22" },
    });
    // Só o que a API usa: sem Scan, sem escrita em lote, sem acesso a índices.
    tabela.grant(
      api,
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    );

    // Pública de propósito: o JWT é a barreira (ver design.md, D1).
    const urlApi = api.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

    const site = new s3.Bucket(this, "Site", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // O plano gratuito do CloudFront (preço fixo, sem cobrança de excedente) exige
    // uma Web ACL do WAF na distribuição, no escopo CLOUDFRONT (só em us-east-1).
    // As regras são as mesmas que o console cria por padrão para o plano.
    const gruposDeRegras = [
      "AWSManagedRulesAmazonIpReputationList",
      "AWSManagedRulesCommonRuleSet",
      "AWSManagedRulesKnownBadInputsRuleSet",
    ];
    const waf = new wafv2.CfnWebACL(this, "Waf", {
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: "ContasDaCasa",
      },
      rules: gruposDeRegras.map((nome, prioridade) => ({
        name: `AWS-${nome}`,
        priority: prioridade,
        overrideAction: { none: {} },
        statement: { managedRuleGroupStatement: { vendorName: "AWS", name: nome } },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          sampledRequestsEnabled: true,
          metricName: `AWS-${nome}`,
        },
      })),
    });

    const distribuicao = new cloudfront.Distribution(this, "Distribuicao", {
      comment: "Contas da casa",
      webAclId: waf.attrArn,
      defaultRootObject: "index.html",
      // O plano gratuito recusa a distribuição ("not eligible") com PRICE_CLASS_100;
      // com PRICE_CLASS_ALL, mantendo o resto igual, a assinatura é aceita.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: new origins.FunctionUrlOrigin(urlApi),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          // Encaminha Authorization e o corpo; só o Host é trocado pelo da Lambda.
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    new CfnOutput(this, "NomeDaTabela", { value: tabela.tableName });
    new CfnOutput(this, "NomeDoBucket", { value: site.bucketName });
    new CfnOutput(this, "DistribuicaoId", { value: distribuicao.distributionId });
    new CfnOutput(this, "DistribuicaoArn", {
      value: `arn:${this.partition}:cloudfront::${this.account}:distribution/${distribuicao.distributionId}`,
    });
    new CfnOutput(this, "WafArn", { value: waf.attrArn });
    new CfnOutput(this, "Endereco", { value: `https://${distribuicao.distributionDomainName}` });
    new CfnOutput(this, "UrlDaLambda", { value: urlApi.url });
  }
}
