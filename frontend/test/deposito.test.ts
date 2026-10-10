import { describe, expect, it } from "vitest";
import { dividirDeposito, tabelaDePadroes } from "../src/deposito";

describe("dividirDeposito", () => {
  it.each([
    [100000, 60, 40, 60000, 40000],
    [10001, 50, 50, 5001, 5000],
    [10001, 33, 67, 3300, 6701],
    [100000, 100, 0, 100000, 0],
    [100000, 0, 100, 0, 100000],
    [1, 50, 50, 1, 0],
    [1, 40, 60, 0, 1],
  ])("%d centavos a %d/%d -> %d e %d", (total, a, i, esperadoA, esperadoI) => {
    expect(dividirDeposito(total, { ariel: a, isabella: i })).toEqual({ ariel: esperadoA, isabella: esperadoI });
  });

  it("a soma é sempre o total", () => {
    for (let total = 1; total <= 500; total++) {
      for (const pct of [0, 1, 33, 50, 60, 67, 99, 100]) {
        const p = dividirDeposito(total, { ariel: pct, isabella: 100 - pct });
        expect(p.ariel + p.isabella).toBe(total);
        expect(p.ariel).toBeGreaterThanOrEqual(0);
        expect(p.isabella).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("tabelaDePadroes", () => {
  it("tem dez linhas, de R$ 1.000 a R$ 10.000, em ordem", () => {
    const linhas = tabelaDePadroes({ ariel: 60, isabella: 40 });
    expect(linhas.map((l) => l.total / 100)).toEqual([1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]);
  });

  it("a 60/40, primeira e última linhas", () => {
    const linhas = tabelaDePadroes({ ariel: 60, isabella: 40 });
    expect(linhas[0]).toEqual({ total: 100000, ariel: 60000, isabella: 40000 });
    expect(linhas[9]).toEqual({ total: 1000000, ariel: 600000, isabella: 400000 });
  });

  it("a 70/30, R$ 3.000 dá 2.100 e 900", () => {
    const linha = tabelaDePadroes({ ariel: 70, isabella: 30 })[2]!;
    expect(linha).toEqual({ total: 300000, ariel: 210000, isabella: 90000 });
  });

  it("a soma é o total e os valores são inteiros em reais, para qualquer proporção", () => {
    for (let pct = 0; pct <= 100; pct++) {
      for (const l of tabelaDePadroes({ ariel: pct, isabella: 100 - pct })) {
        expect(l.ariel + l.isabella).toBe(l.total);
        expect(l.ariel % 100).toBe(0);
        expect(l.isabella % 100).toBe(0);
      }
    }
  });
});
