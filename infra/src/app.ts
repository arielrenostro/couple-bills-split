import { App } from "aws-cdk-lib";
import { ContasStack } from "./stack";

const app = new App();
new ContasStack(app, "ContasDaCasa", {
  description: "Contas da casa: PWA (S3 + CloudFront), API (Lambda) e DynamoDB",
});
