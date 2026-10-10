import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarRepositorio } from "../../src/dados/repositorio";
import { gerarId } from "../../src/dados/id";
import { calcular } from "../../src/domain/ledger";
import { acerto, despesa, mudancaProporcao } from "../domain/helpers";
import { criarTabelaDeTeste } from "./tabela";

let t: Awaited<ReturnType<typeof criarTabelaDeTeste>>;

beforeAll(async () => {
  t = await criarTabelaDeTeste();
});
afterAll(async () => {
  await t?.remover();
});

describe("gerarId", () => {
  it("gera ids únicos e crescentes, mesmo no mesmo milissegundo", () => {
    const ids = Array.from({ length: 1000 }, () => gerarId(1_700_000_000_000));
    expect(new Set(ids).size).toBe(1000);
    expect([...ids].sort()).toEqual(ids);
  });

  it("ids de instantes posteriores ordenam depois", () => {
    expect(gerarId(1_700_000_000_000) < gerarId(1_700_000_000_001)).toBe(true);
  });
});

describe("lançamentos no DynamoDB", () => {
  it("lista ordenada por data e, em empate, por ordem de criação", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const a = despesa({ id: "03", valor: 100, pagoPor: "ariel", data: "2026-10-02" });
    const b = despesa({ id: "01", valor: 200, pagoPor: "ariel", data: "2026-10-03" });
    const c = despesa({ id: "02", valor: 300, pagoPor: "ariel", data: "2026-10-02" });
    const d = acerto({ id: "04", valor: 50, pagoPor: "isabella", data: "2026-10-01" });
    // Gravados fora de ordem de propósito.
    for (const l of [b, a, d, c]) await repo.gravarLancamento(l);

    const lista = await repo.listarLancamentos();
    expect(lista.map((l) => l.id)).toEqual(["04", "02", "03", "01"]);
    // A ordem do banco é a mesma que o domínio usa.
    expect(calcular(lista).itens.map((i) => i.lancamento.id)).toEqual(["04", "02", "03", "01"]);
  });

  it("preserva todos os campos de cada tipo", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const padrao = despesa({ id: "10", valor: 12345, pagoPor: "isabella", data: "2026-11-01", descricao: "Luz" });
    const custom = despesa({
      id: "11",
      valor: 999,
      pagoPor: "ariel",
      data: "2026-11-02",
      proporcao: { ariel: 70, isabella: 30 },
    });
    const prop = mudancaProporcao({ id: "12", ariel: 60, data: "2026-11-03" });
    for (const l of [padrao, custom, prop]) await repo.gravarLancamento(l);

    const lista = (await repo.listarLancamentos()).filter((l) => ["10", "11", "12"].includes(l.id));
    expect(lista).toEqual([padrao, custom, prop]);
    expect(lista[0]).not.toHaveProperty("pk");
    expect(lista[0]).not.toHaveProperty("sk");
  });

  it("recusa gravar duas vezes o mesmo lançamento", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const l = despesa({ id: "20", valor: 100, pagoPor: "ariel", data: "2026-12-01" });
    await repo.gravarLancamento(l);
    await expect(repo.gravarLancamento({ ...l, valor: 999 })).rejects.toThrow();
    const gravado = (await repo.listarLancamentos()).find((x) => x.id === "20");
    expect(gravado).toMatchObject({ valor: 100 });
  });

  it("remove definitivamente e informa quando o lançamento já não existe", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const l = despesa({ id: "30", valor: 100, pagoPor: "ariel", data: "2026-12-05" });
    await repo.gravarLancamento(l);
    expect(await repo.removerLancamento(l)).toBe(true);
    expect((await repo.listarLancamentos()).some((x) => x.id === "30")).toBe(false);
    expect(await repo.removerLancamento(l)).toBe(false);
  });

  it("lê todos os itens mesmo com mais de uma página de resultados", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const base = await repo.listarLancamentos();
    // Cada item tem ~1,2 KB de descrição: 1 MB de página exige 900+ itens.
    const descricao = "x".repeat(1200);
    const novos = Array.from({ length: 950 }, (_, i) =>
      despesa({ id: `p${String(i).padStart(4, "0")}`, valor: 1, pagoPor: "ariel", data: "2027-01-01", descricao }),
    );
    for (let i = 0; i < novos.length; i += 25) {
      await Promise.all(novos.slice(i, i + 25).map((l) => repo.gravarLancamento(l)));
    }
    const todos = await repo.listarLancamentos();
    expect(todos.length).toBe(base.length + 950);
  }, 60_000);
});
