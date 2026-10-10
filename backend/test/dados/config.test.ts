import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { criarRepositorio } from "../../src/dados/repositorio";
import { criarTabelaDeTeste } from "./tabela";

let t: Awaited<ReturnType<typeof criarTabelaDeTeste>>;

beforeAll(async () => {
  t = await criarTabelaDeTeste();
});
afterAll(async () => {
  await t?.remover();
});

describe("item de configuração (CONFIG/main)", () => {
  it("não há credencial antes da inicialização", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    expect(await repo.lerCredencial()).toBeNull();
  });

  it("duas criações simultâneas do segredo resultam num único segredo", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const segredos = await Promise.all(
      Array.from({ length: 10 }, (_, i) => repo.garantirJwtSecret(() => `segredo-${i}`)),
    );
    expect(new Set(segredos).size).toBe(1);

    const gravado = await t.doc.send(
      new GetCommand({ TableName: t.tabela, Key: { pk: "CONFIG", sk: "main" } }),
    );
    expect(gravado.Item?.jwtSecret).toBe(segredos[0]);
  });

  it("chamadas posteriores devolvem o segredo já gravado, sem gerar outro", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const primeiro = await repo.garantirJwtSecret(() => "novo-1");
    const segundo = await repo.garantirJwtSecret(() => "novo-2");
    expect(segundo).toBe(primeiro);
  });

  it("o item só com segredo ainda não conta como credencial", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    await repo.garantirJwtSecret(() => "x");
    expect(await repo.lerCredencial()).toBeNull();
  });
});
