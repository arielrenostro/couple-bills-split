import { describe, expect, it } from "vitest";
import { dividirDespesa } from "../../src/domain/divisao";

describe("dividirDespesa", () => {
  it("divide 50/50 sem sobra", () => {
    expect(dividirDespesa(10000, "ariel", { ariel: 50, isabella: 50 })).toEqual({
      ariel: 5000,
      isabella: 5000,
    });
  });

  it("aplica a proporção a quem não pagou", () => {
    // Ariel pagou R$ 100,00; Isabella fica com 40%.
    expect(dividirDespesa(10000, "ariel", { ariel: 60, isabella: 40 })).toEqual({
      ariel: 6000,
      isabella: 4000,
    });
    // Isabella pagou R$ 100,00; Ariel fica com 60%.
    expect(dividirDespesa(10000, "isabella", { ariel: 60, isabella: 40 })).toEqual({
      ariel: 6000,
      isabella: 4000,
    });
  });

  it("R$ 0,01 em 50/50 soma R$ 0,01 e quem não pagou arredonda para cima", () => {
    const pagoAriel = dividirDespesa(1, "ariel", { ariel: 50, isabella: 50 });
    expect(pagoAriel).toEqual({ ariel: 0, isabella: 1 });
    expect(pagoAriel.ariel + pagoAriel.isabella).toBe(1);

    const pagoIsabella = dividirDespesa(1, "isabella", { ariel: 50, isabella: 50 });
    expect(pagoIsabella).toEqual({ ariel: 1, isabella: 0 });
    expect(pagoIsabella.ariel + pagoIsabella.isabella).toBe(1);
  });

  it("arredonda a parte do outro e dá o restante a quem pagou", () => {
    // R$ 0,10 em 33/67 pago por Ariel: 10 * 67% = 6,7 -> 7; Ariel fica com 3.
    expect(dividirDespesa(10, "ariel", { ariel: 33, isabella: 67 })).toEqual({
      ariel: 3,
      isabella: 7,
    });
  });

  it("aceita proporções nos extremos", () => {
    expect(dividirDespesa(5000, "ariel", { ariel: 100, isabella: 0 })).toEqual({
      ariel: 5000,
      isabella: 0,
    });
    expect(dividirDespesa(5000, "ariel", { ariel: 0, isabella: 100 })).toEqual({
      ariel: 0,
      isabella: 5000,
    });
  });

  it("a soma das partes é sempre o total", () => {
    const violacoes: string[] = [];
    for (let valor = 1; valor <= 500; valor++) {
      for (let pctAriel = 0; pctAriel <= 100; pctAriel += 7) {
        for (const pagoPor of ["ariel", "isabella"] as const) {
          const partes = dividirDespesa(valor, pagoPor, {
            ariel: pctAriel,
            isabella: 100 - pctAriel,
          });
          const soma = partes.ariel + partes.isabella;
          if (soma !== valor || partes.ariel < 0 || partes.isabella < 0) {
            violacoes.push(`${valor} ${pagoPor} ${pctAriel}/${100 - pctAriel}`);
          }
        }
      }
    }
    expect(violacoes).toEqual([]);
  });
});
