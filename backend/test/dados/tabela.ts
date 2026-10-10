import { randomUUID } from "node:crypto";
import {
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { criarDocClient } from "../../src/dados/cliente";

export const ENDPOINT_LOCAL = process.env.DYNAMODB_ENDPOINT ?? "http://127.0.0.1:8000";

/**
 * Cria uma tabela com nome único no DynamoDB Local. Exige o container em
 * execução (veja `npm run db:local`); sem ele, o teste falha com a causa.
 */
export async function criarTabelaDeTeste() {
  const doc = criarDocClient({ endpoint: ENDPOINT_LOCAL });
  const tabela = `contas-teste-${randomUUID()}`;
  try {
    await doc.send(
      new CreateTableCommand({
        TableName: tabela,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
      }),
    );
  } catch (e) {
    throw new Error(
      `DynamoDB Local indisponível em ${ENDPOINT_LOCAL}. Suba com "npm run db:local" no backend. Causa: ${String(e)}`,
    );
  }
  return {
    doc,
    tabela,
    async remover() {
      await doc.send(new DeleteTableCommand({ TableName: tabela }));
    },
  };
}
