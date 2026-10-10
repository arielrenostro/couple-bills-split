import { describe, expect, it } from "vitest";
import {
  outraPessoa,
  PESSOAS,
  PROPORCAO_INICIAL,
  type Despesa,
  type Lancamento,
  type NovoLancamento,
} from "../../src/domain/tipos";

// Estes testes também são verificados por `npm run typecheck`: cada
// `@ts-expect-error` falha a compilação se o tipo deixar de rejeitar o campo faltando.

describe("tipos do ledger", () => {
  it("aceita uma despesa completa", () => {
    const despesa: Despesa = {
      id: "01",
      tipo: "despesa",
      data: "2026-10-01",
      criadoEm: "2026-10-01T10:00:00Z",
      criadoPor: "ariel",
      descricao: "Mercado",
      valor: 12000,
      pagoPor: "ariel",
      proporcao: null,
    };
    expect(despesa.valor).toBe(12000);
  });

  it("rejeita despesa sem valor", () => {
    // @ts-expect-error falta `valor`
    const invalida: Despesa = {
      id: "01",
      tipo: "despesa",
      data: "2026-10-01",
      criadoEm: "2026-10-01T10:00:00Z",
      criadoPor: "ariel",
      descricao: "Mercado",
      pagoPor: "ariel",
      proporcao: null,
    };
    expect(invalida).toBeDefined();
  });

  it("rejeita despesa sem a proporção (nem null)", () => {
    // @ts-expect-error falta `proporcao`
    const invalida: Lancamento = {
      id: "01",
      tipo: "despesa",
      data: "2026-10-01",
      criadoEm: "2026-10-01T10:00:00Z",
      criadoPor: "ariel",
      descricao: "Mercado",
      valor: 100,
      pagoPor: "ariel",
    };
    expect(invalida).toBeDefined();
  });

  it("rejeita acerto sem quem pagou", () => {
    // @ts-expect-error falta `pagoPor`
    const invalido: Lancamento = {
      id: "01",
      tipo: "acerto",
      data: "2026-10-01",
      criadoEm: "2026-10-01T10:00:00Z",
      criadoPor: "ariel",
      valor: 100,
    };
    expect(invalido).toBeDefined();
  });

  it("rejeita pessoa desconhecida", () => {
    const novo: NovoLancamento = {
      tipo: "acerto",
      data: "2026-10-01",
      criadoPor: "ariel",
      valor: 100,
      // @ts-expect-error só existem ariel e isabella
      pagoPor: "maria",
    };
    expect(novo).toBeDefined();
  });

  it("NovoLancamento não carrega id nem criadoEm", () => {
    const novo: NovoLancamento = {
      tipo: "proporcao",
      data: "2026-10-01",
      criadoPor: "isabella",
      proporcao: { ariel: 60, isabella: 40 },
    };
    expect("id" in novo).toBe(false);
  });

  it("expõe as pessoas, a proporção inicial e outraPessoa", () => {
    expect(PESSOAS).toEqual(["ariel", "isabella"]);
    expect(PROPORCAO_INICIAL).toEqual({ ariel: 50, isabella: 50 });
    expect(outraPessoa("ariel")).toBe("isabella");
    expect(outraPessoa("isabella")).toBe("ariel");
  });
});
