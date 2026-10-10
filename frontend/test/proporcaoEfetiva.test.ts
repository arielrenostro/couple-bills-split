import { describe, expect, it } from "vitest";
import { formatarPorcentagemDecimal } from "../src/formato";
import { proporcaoEfetiva } from "../src/proporcaoEfetiva";

describe("proporcaoEfetiva", () => {
  it("72/48 de 120 dá 60% e 40%", () => {
    expect(proporcaoEfetiva({ ariel: 7200, isabella: 4800 }, 12000)).toEqual({ ariel: 600, isabella: 400 });
  });

  it("70/50 de 120 dá 58,3% e 41,7%", () => {
    expect(proporcaoEfetiva({ ariel: 7000, isabella: 5000 }, 12000)).toEqual({ ariel: 583, isabella: 417 });
  });

  it("ciclo sem contas é null", () => {
    expect(proporcaoEfetiva({ ariel: 0, isabella: 0 }, 0)).toBeNull();
  });

  it("100% para um lado", () => {
    expect(proporcaoEfetiva({ ariel: 5000, isabella: 0 }, 5000)).toEqual({ ariel: 1000, isabella: 0 });
    expect(proporcaoEfetiva({ ariel: 0, isabella: 5000 }, 5000)).toEqual({ ariel: 0, isabella: 1000 });
  });

  it("1 centavo", () => {
    expect(proporcaoEfetiva({ ariel: 1, isabella: 0 }, 1)).toEqual({ ariel: 1000, isabella: 0 });
  });

  it("a soma é sempre 1000 décimos", () => {
    for (let total = 1; total <= 300; total++) {
      for (let ariel = 0; ariel <= total; ariel += 7) {
        const p = proporcaoEfetiva({ ariel, isabella: total - ariel }, total)!;
        expect(p.ariel + p.isabella).toBe(1000);
        expect(p.ariel).toBeGreaterThanOrEqual(0);
        expect(p.isabella).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("formatarPorcentagemDecimal", () => {
  it.each([
    [600, "60%"],
    [400, "40%"],
    [0, "0%"],
    [1000, "100%"],
    [583, "58,3%"],
    [417, "41,7%"],
    [5, "0,5%"],
    [995, "99,5%"],
  ])("%d -> %s", (decimos, esperado) => {
    expect(formatarPorcentagemDecimal(decimos)).toBe(esperado);
  });
});
