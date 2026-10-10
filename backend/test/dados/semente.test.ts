import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { autenticar } from "../../src/auth/autenticacao";
import { criarRepositorio } from "../../src/dados/repositorio";
import { semear } from "../../src/dados/semente";
import { calcular } from "../../src/domain/ledger";
import { criarTabelaDeTeste } from "./tabela";

let t: Awaited<ReturnType<typeof criarTabelaDeTeste>>;

beforeAll(async () => {
  t = await criarTabelaDeTeste();
});
afterAll(async () => {
  await t?.remover();
});

describe("semear", () => {
  it("deixa a senha batman funcionando e a proporção em 50/50", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    expect(await semear(repo, { hoje: "2026-10-10" })).toBe(true);

    expect(await autenticar(repo, "ariel", "batman")).toBe("ariel");
    expect(await autenticar(repo, "isabella", "batman")).toBe("isabella");
    expect(await autenticar(repo, "ariel", "outra")).toBeNull();
    expect(calcular(await repo.listarLancamentos()).proporcaoVigente).toEqual({ ariel: 50, isabella: 50 });
  });

  it("rodar de novo não muda nada", async () => {
    const repo = criarRepositorio(t.doc, t.tabela);
    const antes = { cred: await repo.lerCredencial(), ledger: await repo.listarLancamentos() };
    expect(await semear(repo, { hoje: "2026-10-11" })).toBe(false);
    expect(await repo.lerCredencial()).toEqual(antes.cred);
    expect(await repo.listarLancamentos()).toEqual(antes.ledger);
  });
});
