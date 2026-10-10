/**
 * API local para desenvolvimento: roda o mesmo manipulador da Lambda sobre um
 * servidor HTTP, contra o DynamoDB Local (`npm run db:local`).
 *
 *   npx tsx scripts/dev-server.ts [--porta 8787] [--tabela contas-dev]
 *
 * Cria a tabela se não existir e a inicializa (senha batman, proporção 50/50).
 */
import { createServer } from "node:http";
import { CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { criarManipulador, hojeNoFuso } from "../src/api/rotas";
import { criarProvedorDeSegredo } from "../src/auth/sessao";
import { criarDocClient } from "../src/dados/cliente";
import { criarRepositorio } from "../src/dados/repositorio";
import { semear } from "../src/dados/semente";

function argumento(nome: string, padrao: string): string {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? (process.argv[i + 1] ?? padrao) : padrao;
}

const porta = Number(argumento("porta", "8787"));
const tabela = argumento("tabela", "contas-dev");
const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://127.0.0.1:8000";

const doc = criarDocClient({ endpoint });
try {
  await doc.send(new DescribeTableCommand({ TableName: tabela }));
} catch {
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
}

const repo = criarRepositorio(doc, tabela);
await semear(repo, { hoje: hojeNoFuso(new Date()) });

const manipular = criarManipulador({
  repo,
  obterSegredo: criarProvedorDeSegredo(repo),
  agora: () => new Date(),
});

createServer(async (req, res) => {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  const url = new URL(req.url ?? "/", "http://local");
  const headers: Record<string, string> = {};
  for (const [nome, valor] of Object.entries(req.headers)) {
    if (typeof valor === "string") headers[nome] = valor;
  }
  const resposta = await manipular({
    rawPath: url.pathname,
    headers,
    body: partes.length ? Buffer.concat(partes).toString("utf8") : null,
    requestContext: { http: { method: req.method ?? "GET" } },
  });
  res.writeHead(resposta.statusCode, resposta.headers);
  res.end(resposta.body);
}).listen(porta, "127.0.0.1", () => {
  console.log(`API local em http://127.0.0.1:${porta} (tabela ${tabela}, senha inicial "batman")`);
});
