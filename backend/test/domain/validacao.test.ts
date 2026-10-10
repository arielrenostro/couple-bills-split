import { beforeEach, describe, expect, it } from "vitest";
import {
  dataValida,
  proporcaoValida,
  validarNovoLancamento,
  validarRemocao,
} from "../../src/domain/validacao";
import type { NovoLancamento } from "../../src/domain/tipos";
import { acerto, despesa, mudancaProporcao, reiniciarIds } from "./helpers";

const HOJE = "2026-10-10";

function novaDespesa(sobre: Partial<Extract<NovoLancamento, { tipo: "despesa" }>> = {}): NovoLancamento {
  return {
    tipo: "despesa",
    data: HOJE,
    criadoPor: "ariel",
    descricao: "Mercado",
    valor: 12000,
    pagoPor: "ariel",
    proporcao: null,
    ...sobre,
  };
}

function codigos(erros: { codigo: string }[]): string[] {
  return erros.map((e) => e.codigo);
}

beforeEach(() => reiniciarIds());

describe("validarNovoLancamento: valores", () => {
  it("aceita uma despesa válida", () => {
    expect(validarNovoLancamento([], novaDespesa(), HOJE)).toEqual([]);
  });

  it.each([0, -100, 1.5, Number.NaN])("recusa valor %s", (valor) => {
    expect(codigos(validarNovoLancamento([], novaDespesa({ valor }), HOJE))).toContain(
      "VALOR_INVALIDO",
    );
  });

  it("recusa acerto com valor zero", () => {
    const novo: NovoLancamento = { tipo: "acerto", data: HOJE, criadoPor: "ariel", valor: 0, pagoPor: "ariel" };
    expect(codigos(validarNovoLancamento([], novo, HOJE))).toContain("VALOR_INVALIDO");
  });

  it("exige descrição na despesa", () => {
    expect(codigos(validarNovoLancamento([], novaDespesa({ descricao: "   " }), HOJE))).toContain(
      "DESCRICAO_OBRIGATORIA",
    );
  });

  it("recusa proporção customizada que não soma 100", () => {
    const erros = validarNovoLancamento(
      [],
      novaDespesa({ proporcao: { ariel: 70, isabella: 40 } }),
      HOJE,
    );
    expect(codigos(erros)).toContain("PROPORCAO_INVALIDA");
  });

  it("recusa lançamento de proporção inválido", () => {
    const novo: NovoLancamento = {
      tipo: "proporcao",
      data: HOJE,
      criadoPor: "ariel",
      proporcao: { ariel: 101, isabella: -1 },
    };
    expect(codigos(validarNovoLancamento([], novo, HOJE))).toContain("PROPORCAO_INVALIDA");
  });

  it("proporcaoValida exige inteiros entre 0 e 100 somando 100", () => {
    expect(proporcaoValida({ ariel: 60, isabella: 40 })).toBe(true);
    expect(proporcaoValida({ ariel: 100, isabella: 0 })).toBe(true);
    expect(proporcaoValida({ ariel: 60.5, isabella: 39.5 })).toBe(false);
    expect(proporcaoValida({ ariel: 50, isabella: 40 })).toBe(false);
  });
});

describe("validarNovoLancamento: datas (spec ledger: Regras de data)", () => {
  it("aceita a data de hoje", () => {
    expect(validarNovoLancamento([], novaDespesa({ data: HOJE }), HOJE)).toEqual([]);
  });

  it("aceita data retroativa dentro do ciclo aberto", () => {
    const existentes = [
      despesa({ valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 6000, pagoPor: "isabella", data: "2026-10-03" }), // fecha
    ];
    expect(validarNovoLancamento(existentes, novaDespesa({ data: "2026-10-08" }), HOJE)).toEqual([]);
  });

  it("recusa data futura", () => {
    expect(codigos(validarNovoLancamento([], novaDespesa({ data: "2026-10-11" }), HOJE))).toEqual([
      "DATA_FUTURA",
    ]);
  });

  it("recusa data anterior ao acerto que fechou o último ciclo", () => {
    const existentes = [
      despesa({ valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 6000, pagoPor: "isabella", data: "2026-10-05" }), // fecha
    ];
    expect(
      codigos(validarNovoLancamento(existentes, novaDespesa({ data: "2026-10-04" }), HOJE)),
    ).toEqual(["DATA_ANTES_DO_FECHAMENTO"]);
  });

  it("aceita a data do próprio dia do fechamento", () => {
    const existentes = [
      despesa({ valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 6000, pagoPor: "isabella", data: "2026-10-05" }),
    ];
    expect(validarNovoLancamento(existentes, novaDespesa({ data: "2026-10-05" }), HOJE)).toEqual([]);
  });

  it("sem ciclo fechado qualquer data até hoje vale", () => {
    const existentes = [despesa({ valor: 12000, pagoPor: "ariel", data: "2026-10-01" })];
    expect(validarNovoLancamento(existentes, novaDespesa({ data: "2020-01-01" }), HOJE)).toEqual([]);
  });

  it("um acerto parcial não cria data mínima", () => {
    const existentes = [
      despesa({ valor: 20000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 1000, pagoPor: "isabella", data: "2026-10-05" }),
    ];
    expect(validarNovoLancamento(existentes, novaDespesa({ data: "2026-10-02" }), HOJE)).toEqual([]);
  });

  it.each(["2026-13-01", "2026-02-30", "10/10/2026", "2026-1-1", ""])(
    "recusa a data inválida %j",
    (data) => {
      expect(dataValida(data)).toBe(false);
      expect(codigos(validarNovoLancamento([], novaDespesa({ data }), HOJE))).toEqual([
        "DATA_INVALIDA",
      ]);
    },
  );

  it("aceita 29 de fevereiro em ano bissexto", () => {
    expect(dataValida("2028-02-29")).toBe(true);
    expect(dataValida("2026-02-29")).toBe(false);
  });
});

describe("validarRemocao (spec ledger: Remoção de lançamentos)", () => {
  it("permite remover lançamentos do ciclo aberto", () => {
    const existentes = [
      despesa({ id: "a", valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ id: "b", valor: 1000, pagoPor: "isabella", data: "2026-10-02" }),
      mudancaProporcao({ id: "c", ariel: 60, data: "2026-10-03" }),
    ];
    expect(validarRemocao(existentes, "a")).toBeNull();
    expect(validarRemocao(existentes, "b")).toBeNull();
    expect(validarRemocao(existentes, "c")).toBeNull();
  });

  it("recusa remover lançamento de ciclo fechado", () => {
    const existentes = [
      despesa({ id: "a", valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ id: "b", valor: 6000, pagoPor: "isabella", data: "2026-10-02" }), // fecha
      despesa({ id: "c", valor: 1000, pagoPor: "ariel", data: "2026-10-03" }),
    ];
    expect(validarRemocao(existentes, "a")?.codigo).toBe("CICLO_FECHADO");
    expect(validarRemocao(existentes, "c")).toBeNull();
  });

  it("recusa remover o acerto que fechou o ciclo", () => {
    const existentes = [
      despesa({ id: "a", valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ id: "b", valor: 6000, pagoPor: "isabella", data: "2026-10-02" }),
    ];
    expect(validarRemocao(existentes, "b")?.codigo).toBe("ACERTO_DE_FECHAMENTO");
  });

  it("recusa remover lançamento inexistente", () => {
    expect(validarRemocao([], "nada")?.codigo).toBe("LANCAMENTO_INEXISTENTE");
  });
});
