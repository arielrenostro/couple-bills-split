import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { calcularHashSenha } from "../../src/auth/senha";
import { criarRepositorio } from "../../src/dados/repositorio";
import { mudancaProporcao } from "../domain/helpers";
import { criarTabelaDeTeste } from "./tabela";

let t: Awaited<ReturnType<typeof criarTabelaDeTeste>>;

beforeAll(async () => {
  t = await criarTabelaDeTeste();
});
afterAll(async () => {
  await t?.remover();
});

const opcoes = (salt: string, id: string) => ({
  senha: "batman",
  salt,
  agora: "2026-10-10T12:00:00Z",
  proporcaoInicial: mudancaProporcao({ id, ariel: 50, data: "2026-10-10" }),
});

describe("inicialização (senha batman + proporção 50/50)", () => {
  it("grava a credencial como sha256(senha + salt) e o primeiro lançamento 50/50", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    expect(await repo.inicializar(opcoes("12345", "init-1"))).toBe(true);

    expect(await repo.lerCredencial()).toEqual({
      salt: "12345",
      hash: calcularHashSenha("batman", "12345"),
    });
    // sha256("batman12345"), o exemplo dado na especificação.
    expect((await repo.lerCredencial())?.hash).toBe(
      "430d8b5fdc5701551186fd1b8596f64b66c4d035acd68a47d4c0eefe4223e52d",
    );

    const lista = await repo.listarLancamentos();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ tipo: "proporcao", proporcao: { ariel: 50, isabella: 50 } });
  });

  it("rodar de novo não duplica nem sobrescreve nada", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    expect(await repo.inicializar(opcoes("outro-salt", "init-2"))).toBe(false);

    expect((await repo.lerCredencial())?.salt).toBe("12345");
    const lista = await repo.listarLancamentos();
    expect(lista).toHaveLength(1);
    expect(lista[0]?.id).toBe("init-1");
  });

  it("inicializações simultâneas deixam exatamente uma", async () => {
    const outra = await criarTabelaDeTeste();
    try {
      const repo = criarRepositorio(outra.doc, outra.tabela);
      const resultados = await Promise.all(
        Array.from({ length: 5 }, (_, i) => repo.inicializar(opcoes(`salt-${i}`, `init-${i}`))),
      );
      expect(resultados.filter(Boolean)).toHaveLength(1);
      expect(await repo.listarLancamentos()).toHaveLength(1);
    } finally {
      await outra.remover();
    }
  });

  it("preserva o segredo do JWT criado antes da inicialização", async () => {
    const outra = await criarTabelaDeTeste();
    try {
      const repo = criarRepositorio(outra.doc, outra.tabela);
      const segredo = await repo.garantirJwtSecret(() => "segredo-antigo");
      expect(await repo.inicializar(opcoes("s", "init-x"))).toBe(true);

      const item = await outra.doc.send(
        new GetCommand({ TableName: outra.tabela, Key: { pk: "CONFIG", sk: "main" } }),
      );
      expect(item.Item?.jwtSecret).toBe(segredo);
      expect(item.Item?.inicializadoEm).toBe("2026-10-10T12:00:00Z");
    } finally {
      await outra.remover();
    }
  });
});
