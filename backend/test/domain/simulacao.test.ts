import { beforeEach, describe, expect, it } from "vitest";
import { simularProporcao } from "../../src/domain/simulacao";
import { calcular } from "../../src/domain/ledger";
import { acerto, despesa, reiniciarIds } from "./helpers";

beforeEach(() => reiniciarIds());

describe("simularProporcao (spec ledger: Preview antes de salvar)", () => {
  it("mostra o saldo antes e depois da nova proporção", () => {
    const existentes = [despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" })];
    const previa = simularProporcao(existentes, { ariel: 60, isabella: 40 }, "2026-10-10");
    expect(previa).toEqual({
      proporcaoAtual: { ariel: 50, isabella: 50 },
      proporcaoNova: { ariel: 60, isabella: 40 },
      saldoAntes: 5000,
      saldoDepois: 4000,
    });
  });

  it("não altera o histórico recebido", () => {
    const existentes = [despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" })];
    const copia = structuredClone(existentes);
    simularProporcao(existentes, { ariel: 80, isabella: 20 }, "2026-10-10");
    expect(existentes).toEqual(copia);
    expect(calcular(existentes).saldoAtual).toBe(5000);
  });

  it("só considera o ciclo aberto", () => {
    const existentes = [
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 5000, pagoPor: "isabella", data: "2026-10-02" }), // fecha
      despesa({ valor: 10000, pagoPor: "isabella", data: "2026-10-03" }),
    ];
    const previa = simularProporcao(existentes, { ariel: 70, isabella: 30 }, "2026-10-10");
    expect(previa.saldoAntes).toBe(-5000);
    expect(previa.saldoDepois).toBe(-7000);
  });

  it("com ciclo aberto vazio o saldo fica zerado antes e depois", () => {
    const previa = simularProporcao([], { ariel: 60, isabella: 40 }, "2026-10-10");
    expect(previa.saldoAntes).toBe(0);
    expect(previa.saldoDepois).toBe(0);
  });

  it("recusa proporção que não soma 100", () => {
    expect(() => simularProporcao([], { ariel: 60, isabella: 60 }, "2026-10-10")).toThrow(RangeError);
  });
});
