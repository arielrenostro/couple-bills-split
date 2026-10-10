import { describe, expect, it } from "vitest";
import { calcularSugestoes, normalizarDescricao } from "../src/sugestoes";
import type { ItemHistorico, Pessoa } from "../src/tipos";

let contador = 0;

interface Opcoes {
  descricao?: string;
  valor?: number;
  criadoPor?: Pessoa;
  pagoPor?: Pessoa;
  ciclo?: number;
  cicloFechado?: boolean;
  data?: string;
  id?: string;
  proporcao?: { ariel: number; isabella: number };
  customizada?: boolean;
}

function despesa(o: Opcoes = {}): ItemHistorico {
  contador++;
  return {
    id: o.id ?? `id${String(contador).padStart(4, "0")}`,
    tipo: "despesa",
    data: o.data ?? "2026-01-10",
    criadoPor: o.criadoPor ?? "ariel",
    descricao: o.descricao ?? "Mercado",
    pagoPor: o.pagoPor ?? "ariel",
    valor: o.valor ?? 10000,
    proporcao: o.proporcao ?? { ariel: 50, isabella: 50 },
    proporcaoCustomizada: o.customizada ?? false,
    proporcaoAnterior: null,
    partes: { ariel: 5000, isabella: 5000 },
    saldoAcumulado: 0,
    saldoAntes: null,
    saldoDepois: null,
    ciclo: o.ciclo ?? 0,
    cicloFechado: o.cicloFechado ?? false,
    fechaCiclo: false,
    removivel: true,
  };
}

function outroTipo(tipo: "acerto" | "proporcao", ciclo = 0): ItemHistorico {
  return {
    ...despesa({ ciclo }),
    tipo,
    descricao: tipo === "acerto" ? "Paguei" : null,
    valor: tipo === "acerto" ? 5000 : null,
  };
}

describe("filtro por despesa e por quem pagou", () => {
  it("só despesas pagas por quem está marcado geram sugestões", () => {
    const historico = [
      despesa({ descricao: "Mercado", pagoPor: "ariel" }),
      despesa({ descricao: "Plano de saúde", pagoPor: "isabella" }),
      outroTipo("acerto"),
      outroTipo("proporcao"),
    ];
    expect(calcularSugestoes(historico, "ariel").map((s) => s.descricao)).toEqual(["Mercado"]);
    expect(calcularSugestoes(historico, "isabella").map((s) => s.descricao)).toEqual(["Plano de saúde"]);
  });

  it("o plano de saúde pago sempre pela Isabella não aparece com o Ariel marcado", () => {
    const historico = [
      despesa({ descricao: "Plano de saúde", pagoPor: "isabella", ciclo: 0, cicloFechado: true }),
      despesa({ descricao: "Plano de saúde", pagoPor: "isabella", ciclo: 1 }),
    ];
    expect(calcularSugestoes(historico, "ariel")).toEqual([]);
    expect(calcularSugestoes(historico, "isabella")).toHaveLength(1);
  });

  it("filtra por quem pagou, não por quem lançou", () => {
    // O Ariel lançou, mas quem pagou foi a Isabella: a conta é da Isabella.
    const item = despesa({ criadoPor: "ariel", pagoPor: "isabella" });
    expect(calcularSugestoes([item], "ariel")).toEqual([]);
    expect(calcularSugestoes([item], "isabella")).toHaveLength(1);
  });

  it("a mesma descrição paga pelos dois gera uma sugestão para cada um, com os valores de cada um", () => {
    const historico = [
      despesa({ descricao: "Mercado", pagoPor: "ariel", valor: 10000, data: "2026-01-01" }),
      despesa({ descricao: "Mercado", pagoPor: "isabella", valor: 20000, data: "2026-01-02" }),
    ];
    expect(calcularSugestoes(historico, "ariel")[0]).toMatchObject({ valor: 10000 });
    expect(calcularSugestoes(historico, "isabella")[0]).toMatchObject({ valor: 20000 });
  });

  it("sem despesas de quem está marcado a lista é vazia", () => {
    expect(calcularSugestoes([], "ariel")).toEqual([]);
    expect(calcularSugestoes([outroTipo("acerto")], "ariel")).toEqual([]);
  });
});

describe("janela de ciclos", () => {
  it("considera o aberto e os 3 fechados mais recentes", () => {
    const historico = [
      despesa({ descricao: "Muito antiga", ciclo: 0, cicloFechado: true }),
      despesa({ descricao: "No limite", ciclo: 1, cicloFechado: true }),
      despesa({ descricao: "Fechado 2", ciclo: 2, cicloFechado: true }),
      despesa({ descricao: "Fechado 3", ciclo: 3, cicloFechado: true }),
      despesa({ descricao: "Aberta", ciclo: 4, cicloFechado: false }),
    ];
    const descricoes = calcularSugestoes(historico, "ariel").map((s) => s.descricao);
    expect(descricoes).not.toContain("Muito antiga");
    expect(descricoes).toHaveLength(4);
    expect(descricoes).toContain("No limite");
  });

  it("com o aberto vazio logo após um fechamento ainda vê 3 ciclos fechados", () => {
    // Ciclos 0..3 fechados; o aberto (índice 4) não tem itens.
    const historico = [
      despesa({ descricao: "Ciclo 0", ciclo: 0, cicloFechado: true }),
      despesa({ descricao: "Ciclo 1", ciclo: 1, cicloFechado: true }),
      despesa({ descricao: "Ciclo 2", ciclo: 2, cicloFechado: true }),
      despesa({ descricao: "Ciclo 3", ciclo: 3, cicloFechado: true }),
    ];
    const descricoes = calcularSugestoes(historico, "ariel").map((s) => s.descricao);
    expect(descricoes).not.toContain("Ciclo 0");
    expect(descricoes.sort()).toEqual(["Ciclo 1", "Ciclo 2", "Ciclo 3"]);
  });

  it("uma conta só de ciclo mais antigo não aparece", () => {
    const historico = [
      despesa({ descricao: "Antiga", ciclo: 0, cicloFechado: true }),
      despesa({ descricao: "Atual", ciclo: 4, cicloFechado: false }),
    ];
    expect(calcularSugestoes(historico, "ariel").map((s) => s.descricao)).toEqual(["Atual"]);
  });
});

describe("normalização da descrição", () => {
  it("ignora caixa, acentos e espaços nas pontas e repetidos", () => {
    expect(normalizarDescricao("  Plano   de  SAÚDE ")).toBe("plano de saude");
    expect(normalizarDescricao("plano de saude")).toBe("plano de saude");
  });

  it('"Plano de saúde" e "plano de saude " viram uma sugestão, com a grafia mais recente', () => {
    const historico = [
      despesa({ descricao: "Plano de saúde", ciclo: 0, cicloFechado: true, data: "2026-01-05" }),
      despesa({ descricao: "plano de saude ", ciclo: 1, data: "2026-02-05" }),
    ];
    const sugestoes = calcularSugestoes(historico, "ariel");
    expect(sugestoes).toHaveLength(1);
    expect(sugestoes[0]!.descricao).toBe("plano de saude ");
  });
});

describe("ranking e limite", () => {
  it("ciclos distintos vencem lançamentos", () => {
    const historico = [
      despesa({ descricao: "Saúde", ciclo: 0, cicloFechado: true }),
      despesa({ descricao: "Saúde", ciclo: 1, cicloFechado: true }),
      despesa({ descricao: "Saúde", ciclo: 2 }),
      ...Array.from({ length: 4 }, () => despesa({ descricao: "Mercado", ciclo: 2 })),
    ];
    expect(calcularSugestoes(historico, "ariel").map((s) => s.descricao)).toEqual(["Saúde", "Mercado"]);
  });

  it("com ciclos iguais, mais lançamentos vencem", () => {
    const historico = [
      despesa({ descricao: "Luz", ciclo: 0 }),
      despesa({ descricao: "Água", ciclo: 0 }),
      despesa({ descricao: "Água", ciclo: 0 }),
    ];
    expect(calcularSugestoes(historico, "ariel").map((s) => s.descricao)).toEqual(["Água", "Luz"]);
  });

  it("com tudo igual, o lançamento mais recente vem primeiro", () => {
    const historico = [
      despesa({ descricao: "Luz", data: "2026-01-02" }),
      despesa({ descricao: "Água", data: "2026-01-20" }),
    ];
    expect(calcularSugestoes(historico, "ariel").map((s) => s.descricao)).toEqual(["Água", "Luz"]);
  });

  it("mostra no máximo 5 sugestões", () => {
    const historico = Array.from({ length: 8 }, (_, i) => despesa({ descricao: `Conta ${i}` }));
    expect(calcularSugestoes(historico, "ariel")).toHaveLength(5);
  });
});

describe("último lançamento", () => {
  it("traz valor e divisão do último por (data, id), não pela ordem da lista", () => {
    const historico = [
      despesa({ descricao: "Plano", valor: 30000, data: "2026-02-05", id: "b", ciclo: 1 }),
      despesa({ descricao: "Plano", valor: 20000, data: "2026-01-05", id: "a", ciclo: 0, cicloFechado: true }),
    ];
    expect(calcularSugestoes(historico, "ariel")[0]).toMatchObject({ valor: 30000 });
  });

  it("na mesma data, desempata pelo id", () => {
    const historico = [
      despesa({ descricao: "Plano", valor: 2, data: "2026-02-05", id: "z" }),
      despesa({ descricao: "Plano", valor: 1, data: "2026-02-05", id: "a" }),
    ];
    expect(calcularSugestoes(historico, "ariel")[0]!.valor).toBe(2);
  });

  it("proporção padrão vira { customizada: false }", () => {
    const [s] = calcularSugestoes([despesa({ customizada: false, proporcao: { ariel: 60, isabella: 40 } })], "ariel");
    expect(s!.proporcao).toEqual({ customizada: false });
  });

  it("proporção customizada guarda o percentual do Ariel", () => {
    const [s] = calcularSugestoes(
      [despesa({ pagoPor: "isabella", customizada: true, proporcao: { ariel: 100, isabella: 0 } })],
      "isabella",
    );
    expect(s!.proporcao).toEqual({ customizada: true, ariel: 100 });
  });
});
