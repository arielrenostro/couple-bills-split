import { beforeEach, describe, expect, it } from "vitest";
import { calcular, descreverSaldo, ordenar } from "../../src/domain/ledger";
import { acerto, despesa, mudancaProporcao, reiniciarIds } from "./helpers";

beforeEach(() => reiniciarIds());

describe("saldo (spec ledger: Cálculo do saldo)", () => {
  it("histórico vazio tem saldo zero e proporção inicial 50/50", () => {
    const h = calcular([]);
    expect(h.saldoAtual).toBe(0);
    expect(h.itens).toEqual([]);
    expect(h.proporcaoVigente).toEqual({ ariel: 50, isabella: 50 });
    expect(h.dataUltimoFechamento).toBeNull();
  });

  it("saldo após uma despesa: Isabella deve R$ 50,00 ao Ariel", () => {
    const h = calcular([despesa({ valor: 10000, pagoPor: "ariel" })]);
    expect(h.saldoAtual).toBe(5000);
    expect(descreverSaldo(h.saldoAtual)).toEqual({
      devedor: "isabella",
      credor: "ariel",
      valor: 5000,
    });
  });

  it("quando a Isabella paga, o Ariel é o devedor", () => {
    const h = calcular([despesa({ valor: 10000, pagoPor: "isabella" })]);
    expect(h.saldoAtual).toBe(-5000);
    expect(descreverSaldo(h.saldoAtual)).toEqual({
      devedor: "ariel",
      credor: "isabella",
      valor: 5000,
    });
  });

  it("despesas de pessoas diferentes se compensam", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel" }),
      despesa({ valor: 6000, pagoPor: "isabella" }),
    ]);
    expect(h.saldoAtual).toBe(2000);
  });

  it("acerto parcial reduz o saldo", () => {
    const h = calcular([
      despesa({ valor: 20000, pagoPor: "ariel" }),
      acerto({ valor: 4000, pagoPor: "isabella" }),
    ]);
    expect(h.saldoAtual).toBe(6000);
  });

  it("acerto maior que a dívida inverte o saldo", () => {
    const h = calcular([
      despesa({ valor: 20000, pagoPor: "ariel" }), // Isabella deve 100,00
      acerto({ valor: 13000, pagoPor: "isabella" }),
    ]);
    expect(h.saldoAtual).toBe(-3000);
    expect(descreverSaldo(h.saldoAtual)).toEqual({
      devedor: "ariel",
      credor: "isabella",
      valor: 3000,
    });
  });

  it("descreverSaldo devolve null quando zerado", () => {
    expect(descreverSaldo(0)).toBeNull();
  });

  it("ordena por data e, em empate, pela ordem de criação", () => {
    const a = despesa({ id: "b", valor: 1, pagoPor: "ariel", data: "2026-10-02" });
    const b = despesa({ id: "a", valor: 2, pagoPor: "ariel", data: "2026-10-02" });
    const c = despesa({ id: "z", valor: 3, pagoPor: "ariel", data: "2026-10-01" });
    expect(ordenar([a, b, c]).map((l) => l.id)).toEqual(["z", "a", "b"]);
  });

  it("não altera a lista recebida", () => {
    const entrada = [
      despesa({ id: "b", valor: 1, pagoPor: "ariel", data: "2026-10-02" }),
      despesa({ id: "a", valor: 2, pagoPor: "ariel", data: "2026-10-01" }),
    ];
    const copia = [...entrada];
    calcular(entrada);
    expect(entrada).toEqual(copia);
  });
});

describe("ciclos (spec ledger: Ciclos de contas)", () => {
  it("acerto que zera o saldo fecha o ciclo", () => {
    const h = calcular([
      despesa({ valor: 12000, pagoPor: "ariel" }), // saldo 6000
      acerto({ valor: 6000, pagoPor: "isabella", data: "2026-10-05" }),
    ]);
    expect(h.saldoAtual).toBe(0);
    expect(h.itens.every((i) => i.cicloFechado)).toBe(true);
    expect(h.itens[1]?.fechaCiclo).toBe(true);
    expect(h.dataUltimoFechamento).toBe("2026-10-05");
  });

  it("acerto parcial não fecha o ciclo", () => {
    const h = calcular([
      despesa({ valor: 20000, pagoPor: "ariel" }),
      acerto({ valor: 4000, pagoPor: "isabella" }),
    ]);
    expect(h.itens.some((i) => i.cicloFechado)).toBe(false);
    expect(h.itens.some((i) => i.fechaCiclo)).toBe(false);
    expect(h.dataUltimoFechamento).toBeNull();
  });

  it("acerto que inverte o saldo não fecha o ciclo", () => {
    const h = calcular([
      despesa({ valor: 20000, pagoPor: "ariel" }),
      acerto({ valor: 13000, pagoPor: "isabella" }),
    ]);
    expect(h.itens.some((i) => i.fechaCiclo)).toBe(false);
  });

  it("saldo zerado por despesas que se compensam não fecha o ciclo", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel" }),
      despesa({ valor: 10000, pagoPor: "isabella" }),
    ]);
    expect(h.saldoAtual).toBe(0);
    expect(h.itens.some((i) => i.cicloFechado)).toBe(false);
  });

  it("lançamentos depois do fechamento formam um novo ciclo aberto", () => {
    const h = calcular([
      despesa({ valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 6000, pagoPor: "isabella", data: "2026-10-05" }),
      despesa({ valor: 4000, pagoPor: "isabella", data: "2026-10-06" }),
    ]);
    expect(h.itens.map((i) => i.ciclo)).toEqual([0, 0, 1]);
    expect(h.itens.map((i) => i.cicloFechado)).toEqual([true, true, false]);
    expect(h.saldoAtual).toBe(-2000);
    expect(h.cicloAberto.totalDespesas).toBe(4000);
  });

  it("o ciclo aberto fica vazio logo depois do fechamento", () => {
    const h = calcular([
      despesa({ valor: 12000, pagoPor: "ariel" }),
      acerto({ valor: 6000, pagoPor: "isabella" }),
    ]);
    expect(h.cicloAberto.totalDespesas).toBe(0);
    expect(h.cicloAberto.saldo).toBe(0);
  });

  it("um ciclo fechado nunca reabre com lançamentos posteriores", () => {
    const fechado = [
      despesa({ valor: 12000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 6000, pagoPor: "isabella", data: "2026-10-05" }),
    ];
    const depois = calcular([
      ...fechado,
      despesa({ valor: 999, pagoPor: "ariel", data: "2026-10-06" }),
      acerto({ valor: 100, pagoPor: "isabella", data: "2026-10-07" }),
      mudancaProporcao({ ariel: 80, data: "2026-10-08" }),
    ]);
    expect(depois.itens[0]?.cicloFechado).toBe(true);
    expect(depois.itens[1]?.cicloFechado).toBe(true);
    expect(depois.itens[1]?.fechaCiclo).toBe(true);
    expect(depois.itens[1]?.saldoAcumulado).toBe(0);
    expect(depois.itens[2]?.ciclo).toBe(1);
  });

  it("calcula o balanço do ciclo aberto (pago, parte e acertos)", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel" }),
      despesa({ valor: 6000, pagoPor: "isabella" }),
      acerto({ valor: 1000, pagoPor: "isabella" }),
    ]);
    expect(h.cicloAberto).toEqual({
      totalDespesas: 16000,
      pago: { ariel: 10000, isabella: 6000 },
      parte: { ariel: 8000, isabella: 8000 },
      acertosPagos: { ariel: 0, isabella: 1000 },
      saldo: 1000,
    });
  });
});

describe("proporção (spec ledger: Mudança de proporção como lançamento)", () => {
  it("reaplica a nova proporção ao ciclo aberto", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      mudancaProporcao({ ariel: 60, data: "2026-10-02" }),
    ]);
    // Antes: Isabella devia 5000. Agora, 40% de 10000 = 4000.
    expect(h.saldoAtual).toBe(4000);
    expect(h.proporcaoVigente).toEqual({ ariel: 60, isabella: 40 });
    expect(h.itens[0]?.proporcao).toEqual({ ariel: 60, isabella: 40 });
    expect(h.itens[0]?.partes).toEqual({ ariel: 6000, isabella: 4000 });
  });

  it("a proporção nova vale também para despesas registradas antes dela", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-03" }),
      mudancaProporcao({ ariel: 70, data: "2026-10-04" }),
    ]);
    expect(h.saldoAtual).toBe(6000);
  });

  it("preserva despesas com proporção customizada", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", proporcao: { ariel: 70, isabella: 30 } }),
      despesa({ valor: 10000, pagoPor: "ariel" }),
      mudancaProporcao({ ariel: 60 }),
    ]);
    // Customizada: 30% de 10000 = 3000. Padrão: 40% de 10000 = 4000.
    expect(h.saldoAtual).toBe(7000);
    expect(h.itens[0]?.partes).toEqual({ ariel: 7000, isabella: 3000 });
  });

  it("não altera um ciclo fechado quando a proporção muda depois", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 5000, pagoPor: "isabella", data: "2026-10-02" }),
      mudancaProporcao({ ariel: 80, data: "2026-10-03" }),
    ]);
    expect(h.itens[0]?.partes).toEqual({ ariel: 5000, isabella: 5000 });
    expect(h.itens[1]?.saldoAcumulado).toBe(0);
    expect(h.itens[1]?.fechaCiclo).toBe(true);
  });

  it("proporção feita depois do fechamento só afeta os ciclos seguintes", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 5000, pagoPor: "isabella", data: "2026-10-02" }),
      mudancaProporcao({ ariel: 80, data: "2026-10-03" }),
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-04" }),
    ]);
    expect(h.saldoAtual).toBe(2000);
    expect(h.itens[3]?.ciclo).toBe(1);
  });

  it("uma mudança de proporção no ciclo fechado vale para ele, não para o anterior", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      mudancaProporcao({ ariel: 60, data: "2026-10-02" }),
      acerto({ valor: 4000, pagoPor: "isabella", data: "2026-10-03" }), // zera com 60/40
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-04" }),
    ]);
    expect(h.itens[2]?.fechaCiclo).toBe(true);
    // Ciclo 0 ficou congelado em 60/40; o ciclo 1 herda 60/40.
    expect(h.itens[0]?.partes).toEqual({ ariel: 6000, isabella: 4000 });
    expect(h.itens[3]?.partes).toEqual({ ariel: 6000, isabella: 4000 });
    expect(h.saldoAtual).toBe(4000);
  });

  it("remover o lançamento de proporção restaura a anterior", () => {
    const base = [
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      mudancaProporcao({ ariel: 60, data: "2026-10-02", id: "p1" }),
      mudancaProporcao({ ariel: 70, data: "2026-10-03", id: "p2" }),
    ];
    expect(calcular(base).saldoAtual).toBe(3000);
    const semUltima = base.filter((l) => l.id !== "p2");
    expect(calcular(semUltima).saldoAtual).toBe(4000);
    const semNenhuma = semUltima.filter((l) => l.id !== "p1");
    expect(calcular(semNenhuma).saldoAtual).toBe(5000);
  });
});

describe("saldo acumulado por lançamento (spec ledger: Consulta de saldo e histórico)", () => {
  it("acumula o saldo do ciclo a cada lançamento", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 2000, pagoPor: "isabella", data: "2026-10-02" }),
      despesa({ valor: 4000, pagoPor: "isabella", data: "2026-10-03" }),
    ]);
    expect(h.itens.map((i) => i.saldoAcumulado)).toEqual([5000, 3000, 1000]);
  });

  it("zera o acumulado no início de cada ciclo", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 5000, pagoPor: "isabella", data: "2026-10-02" }),
      despesa({ valor: 2000, pagoPor: "ariel", data: "2026-10-03" }),
    ]);
    expect(h.itens.map((i) => i.saldoAcumulado)).toEqual([5000, 0, 1000]);
  });

  it("o item de proporção traz proporção anterior, nova e saldo antes e depois", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      mudancaProporcao({ ariel: 60, data: "2026-10-02" }),
    ]);
    const item = h.itens[1];
    expect(item?.proporcaoAnterior).toEqual({ ariel: 50, isabella: 50 });
    expect(item?.proporcao).toEqual({ ariel: 60, isabella: 40 });
    expect(item?.saldoAntes).toBe(5000);
    expect(item?.saldoDepois).toBe(4000);
    expect(item?.saldoAcumulado).toBe(4000);
  });

  it("proporção como primeiro lançamento do ciclo tem saldo antes e depois zerados", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      acerto({ valor: 5000, pagoPor: "isabella", data: "2026-10-02" }),
      mudancaProporcao({ ariel: 60, data: "2026-10-03" }),
    ]);
    const item = h.itens[2];
    expect(item?.saldoAntes).toBe(0);
    expect(item?.saldoDepois).toBe(0);
  });

  it("encadeia proporção anterior entre mudanças sucessivas", () => {
    const h = calcular([
      mudancaProporcao({ ariel: 60, data: "2026-10-01" }),
      mudancaProporcao({ ariel: 70, data: "2026-10-02" }),
    ]);
    expect(h.itens[0]?.proporcaoAnterior).toEqual({ ariel: 50, isabella: 50 });
    expect(h.itens[1]?.proporcaoAnterior).toEqual({ ariel: 60, isabella: 40 });
  });

  it("histórico misto: despesa, customizada, proporção, acerto parcial e acerto total", () => {
    const h = calcular([
      despesa({ valor: 10000, pagoPor: "ariel", data: "2026-10-01" }),
      despesa({
        valor: 5000,
        pagoPor: "isabella",
        data: "2026-10-02",
        proporcao: { ariel: 20, isabella: 80 },
      }),
      mudancaProporcao({ ariel: 60, data: "2026-10-03" }),
      acerto({ valor: 1000, pagoPor: "isabella", data: "2026-10-04" }),
      acerto({ valor: 2000, pagoPor: "isabella", data: "2026-10-05" }),
    ]);
    // Ariel pagou 100,00: Isabella deve 40,00 (60/40). Isabella pagou 50,00 com
    // 20/80: Ariel deve 10,00. Saldo: 40,00 - 10,00 = 30,00.
    expect(h.itens.map((i) => i.saldoAcumulado)).toEqual([5000, 4000, 3000, 2000, 0]);
    expect(h.itens[4]?.fechaCiclo).toBe(true);
    expect(h.saldoAtual).toBe(0);
  });
});
