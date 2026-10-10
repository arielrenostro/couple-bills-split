import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/** Cliente de documentos; `endpoint` aponta para o DynamoDB Local nos testes. */
export function criarDocClient(opcoes: { endpoint?: string; region?: string } = {}) {
  const base = new DynamoDBClient({
    region: opcoes.region ?? process.env.AWS_REGION ?? "us-east-1",
    ...(opcoes.endpoint
      ? {
          endpoint: opcoes.endpoint,
          credentials: { accessKeyId: "local", secretAccessKey: "local" },
        }
      : {}),
  });
  return DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
