import { beforeAll, describe, expect, it } from "vitest";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { ContasStack } from "../src/stack";

let template: Template;

beforeAll(() => {
  const app = new App();
  template = Template.fromStack(new ContasStack(app, "ContasTeste"));
}, 120_000);

describe("tabela DynamoDB", () => {
  it("usa pk/sk em modo sob demanda, protegida contra exclusão", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
      DeletionProtectionEnabled: true,
    });
    template.hasResource("AWS::DynamoDB::Table", { DeletionPolicy: "Retain" });
  });
});

describe("Lambda da API", () => {
  it("roda em Node 22 arm64 com a tabela no ambiente", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Architectures: ["arm64"],
      Handler: "index.handler",
      Environment: { Variables: { TABELA: Match.anyValue() } },
    });
  });

  it("tem permissão mínima no DynamoDB, sem Scan nem curingas", () => {
    const politicas = template.findResources("AWS::IAM::Policy");
    const acoes = Object.values(politicas)
      .flatMap((p: any) => p.Properties.PolicyDocument.Statement)
      .filter((s: any) => JSON.stringify(s.Action).includes("dynamodb"))
      .flatMap((s: any) => (Array.isArray(s.Action) ? s.Action : [s.Action]));

    expect([...acoes].sort()).toEqual([
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]);
  });

  it("expõe uma Function URL pública (o JWT é a barreira)", () => {
    template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "NONE" });
  });
});

describe("site estático", () => {
  it("o bucket é privado, criptografado e só aceita TLS", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: Match.anyValue(),
    });
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Deny",
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          }),
        ]),
      },
    });
  });
});

describe("CloudFront (mesma origem para app e API)", () => {
  it("serve o site por padrão e redireciona HTTP para HTTPS", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: "index.html",
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: "redirect-to-https" }),
      }),
    });
  });

  it("usa todos os pontos de presença: é o que o plano gratuito aceita", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({ PriceClass: "PriceClass_All" }),
    });
  });

  it("roteia /api/* para a Lambda, sem cache e com todos os métodos", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: [
          Match.objectLike({
            PathPattern: "/api/*",
            ViewerProtocolPolicy: "https-only",
            AllowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
            // CachingDisabled e AllViewerExceptHostHeader (ids gerenciados do CloudFront).
            CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
            OriginRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
          }),
        ],
      }),
    });
  });

  it("não usa OAC na Lambda (só no bucket)", () => {
    const oacs = template.findResources("AWS::CloudFront::OriginAccessControl");
    const tipos = Object.values(oacs).map(
      (r: any) => r.Properties.OriginAccessControlConfig.OriginAccessControlOriginType,
    );
    expect(tipos).toEqual(["s3"]);
  });
});

describe("WAF (exigido pelo plano gratuito do CloudFront)", () => {
  it("tem uma Web ACL de escopo CLOUDFRONT com as 3 regras gerenciadas, dentro do limite de 5", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "CLOUDFRONT",
      DefaultAction: { Allow: {} },
      Rules: [
        Match.objectLike({ Name: "AWS-AWSManagedRulesAmazonIpReputationList", Priority: 0 }),
        Match.objectLike({ Name: "AWS-AWSManagedRulesCommonRuleSet", Priority: 1 }),
        Match.objectLike({ Name: "AWS-AWSManagedRulesKnownBadInputsRuleSet", Priority: 2 }),
      ],
    });
  });

  it("está associada à distribuição", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({ WebACLId: Match.anyValue() }),
    });
  });
});

describe("saídas para o deploy", () => {
  it("publica tabela, bucket, distribuição e endereços", () => {
    for (const nome of ["NomeDaTabela", "NomeDoBucket", "DistribuicaoId", "DistribuicaoArn", "WafArn", "Endereco", "UrlDaLambda"]) {
      expect(template.findOutputs(nome)).not.toEqual({});
    }
  });
});
