import { describe, expect, it } from "vitest";
import {
  formatarData,
  formatarMoeda,
  formatarValorCampo,
  fraseSaldo,
  fraseSaldoAssinado,
  hoje,
  lerValor,
  textoProporcao,
} from "../src/formato";

// O Intl usa espaço não separável entre "R$" e o número.
const normalizar = (s: string) => s.replace(/ /g, " ");

describe("lerValor", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12,50", 1250],
    ["12.50", 1250],
    ["0,99", 99],
    ["1.234,56", 123456],
    ["1.234", 123400],
    ["1234", 123400],
    ["R$ 12,50", 1250],
    ["  7,00 ", 700],
    ["12.345.678", 1234567800],
  ])("lê %j como %i centavos", (texto, centavos) => {
    expect(lerValor(texto)).toBe(centavos);
  });

  it.each(["", "   ", "abc", "0", "0,00", "-5", "12,345", "1,234", "R$", "12,5x", "--"])(
    "recusa %j",
    (texto) => {
      expect(lerValor(texto)).toBeNull();
    },
  );
});

describe("formatação", () => {
  it("formata moeda em reais", () => {
    expect(normalizar(formatarMoeda(12345))).toBe("R$ 123,45");
    expect(normalizar(formatarMoeda(5))).toBe("R$ 0,05");
    expect(normalizar(formatarMoeda(123456789))).toBe("R$ 1.234.567,89");
  });

  it("formata valor para campo e volta igual", () => {
    expect(formatarValorCampo(5000)).toBe("50,00");
    expect(lerValor(formatarValorCampo(123456))).toBe(123456);
  });

  it("formata datas", () => {
    expect(formatarData("2026-10-09")).toBe("09/10/2026");
    expect(hoje(new Date(2026, 9, 9, 23, 59))).toBe("2026-10-09");
    expect(hoje(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("mostra a proporção", () => {
    expect(textoProporcao({ ariel: 60, isabella: 40 })).toBe("60/40");
  });
});

describe("frases de saldo", () => {
  it("diz quem deve a quem, com a preposição certa", () => {
    expect(normalizar(fraseSaldo({ devedor: "isabella", credor: "ariel", valor: 5000 }))).toBe(
      "Isabella deve R$ 50,00 ao Ariel",
    );
    expect(normalizar(fraseSaldo({ devedor: "ariel", credor: "isabella", valor: 3000 }))).toBe(
      "Ariel deve R$ 30,00 à Isabella",
    );
  });

  it("diz que ninguém deve nada quando zerado", () => {
    expect(fraseSaldo(null)).toBe("Ninguém deve nada");
    expect(fraseSaldoAssinado(0)).toBe("Ninguém deve nada");
  });

  it("converte o saldo assinado (positivo: Isabella deve ao Ariel)", () => {
    expect(normalizar(fraseSaldoAssinado(5000))).toBe("Isabella deve R$ 50,00 ao Ariel");
    expect(normalizar(fraseSaldoAssinado(-3000))).toBe("Ariel deve R$ 30,00 à Isabella");
  });
});
