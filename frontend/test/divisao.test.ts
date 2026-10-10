import { describe, expect, it } from "vitest";
import {
  converterPercentual,
  dividirDespesa,
  percentualDe,
  percentualValido,
  proporcaoDoPagador,
  proporcaoParaGravar,
} from "../src/divisao";

// Os casos de dividirDespesa reproduzem backend/test/domain/divisao.test.ts.
describe("dividirDespesa", () => {
  it("divide 50/50 sem sobra", () => {
    expect(dividirDespesa(10000, "ariel", { ariel: 50, isabella: 50 })).toEqual({ ariel: 5000, isabella: 5000 });
  });

  it("aplica a proporção a quem não pagou", () => {
    expect(dividirDespesa(10000, "ariel", { ariel: 60, isabella: 40 })).toEqual({ ariel: 6000, isabella: 4000 });
    expect(dividirDespesa(10000, "isabella", { ariel: 60, isabella: 40 })).toEqual({ ariel: 6000, isabella: 4000 });
  });

  it("R$ 0,05 em 50/50 soma R$ 0,05 e quem não pagou arredonda para cima", () => {
    expect(dividirDespesa(5, "ariel", { ariel: 50, isabella: 50 })).toEqual({ ariel: 2, isabella: 3 });
    expect(dividirDespesa(5, "isabella", { ariel: 50, isabella: 50 })).toEqual({ ariel: 3, isabella: 2 });
  });

  it("R$ 0,01 em 50/50 soma R$ 0,01", () => {
    expect(dividirDespesa(1, "ariel", { ariel: 50, isabella: 50 })).toEqual({ ariel: 0, isabella: 1 });
    expect(dividirDespesa(1, "isabella", { ariel: 50, isabella: 50 })).toEqual({ ariel: 1, isabella: 0 });
  });

  it("arredonda a parte do outro e dá o restante a quem pagou", () => {
    expect(dividirDespesa(10, "ariel", { ariel: 33, isabella: 67 })).toEqual({ ariel: 3, isabella: 7 });
  });

  it("aceita proporções nos extremos", () => {
    expect(dividirDespesa(5000, "ariel", { ariel: 100, isabella: 0 })).toEqual({ ariel: 5000, isabella: 0 });
    expect(dividirDespesa(5000, "ariel", { ariel: 0, isabella: 100 })).toEqual({ ariel: 0, isabella: 5000 });
  });

  it("a soma das partes é sempre o total", () => {
    const violacoes: string[] = [];
    for (let valor = 1; valor <= 500; valor++) {
      for (let pctAriel = 0; pctAriel <= 100; pctAriel += 7) {
        for (const pagoPor of ["ariel", "isabella"] as const) {
          const partes = dividirDespesa(valor, pagoPor, { ariel: pctAriel, isabella: 100 - pctAriel });
          if (partes.ariel + partes.isabella !== valor || partes.ariel < 0 || partes.isabella < 0) {
            violacoes.push(`${valor} ${pagoPor} ${pctAriel}/${100 - pctAriel}`);
          }
        }
      }
    }
    expect(violacoes).toEqual([]);
  });
});

describe("percentual de quem pagou", () => {
  it("lê o percentual da pessoa na divisão", () => {
    expect(percentualDe("ariel", { ariel: 60, isabella: 40 })).toBe(60);
    expect(percentualDe("isabella", { ariel: 60, isabella: 40 })).toBe(40);
  });

  it("monta a divisão a partir do percentual do pagador", () => {
    expect(proporcaoDoPagador("ariel", 60)).toEqual({ ariel: 60, isabella: 40 });
    expect(proporcaoDoPagador("isabella", 60)).toEqual({ ariel: 40, isabella: 60 });
  });

  it("trocar o pagador mantém a divisão: 60 vira 40, 100 vira 0", () => {
    expect(converterPercentual(60)).toBe(40);
    expect(converterPercentual(100)).toBe(0);
    expect(converterPercentual(0)).toBe(100);
  });

  it("ida e volta devolve o valor original e a mesma divisão", () => {
    for (const pct of [0, 1, 40, 60, 100]) {
      expect(converterPercentual(converterPercentual(pct))).toBe(pct);
    }
    const antes = proporcaoDoPagador("ariel", 60);
    const depois = proporcaoDoPagador("isabella", converterPercentual(60));
    expect(depois).toEqual(antes);
  });
});

describe("percentualValido", () => {
  it.each([0, 1, 50, 100])("aceita %i", (n) => expect(percentualValido(n)).toBe(true));
  it.each([-1, 101, 1.5, NaN])("recusa %s", (n) => expect(percentualValido(n)).toBe(false));
});

describe("proporcaoParaGravar", () => {
  const vigente = { ariel: 60, isabella: 40 };

  it("divisão igual à vigente envia null (padrão)", () => {
    expect(proporcaoParaGravar({ ariel: 60, isabella: 40 }, vigente)).toBeNull();
  });

  it("divisão diferente envia { ariel, isabella } (customizada)", () => {
    expect(proporcaoParaGravar({ ariel: 100, isabella: 0 }, vigente)).toEqual({ ariel: 100, isabella: 0 });
  });

  it("vale também quando o pagador é a Isabella", () => {
    // Isabella digita 40 (= divisão 60/40, igual à vigente) e depois 0 (= 100/0).
    expect(proporcaoParaGravar(proporcaoDoPagador("isabella", 40), vigente)).toBeNull();
    expect(proporcaoParaGravar(proporcaoDoPagador("isabella", 0), vigente)).toEqual({ ariel: 100, isabella: 0 });
  });
});
