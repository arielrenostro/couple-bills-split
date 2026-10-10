import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { criarManipulador, hojeNoFuso } from "../../src/api/rotas";
import { criarProvedorDeSegredo } from "../../src/auth/sessao";
import { gerarSalt } from "../../src/auth/senha";
import { gerarId } from "../../src/dados/id";
import { criarRepositorio } from "../../src/dados/repositorio";
import type { Lancamento } from "../../src/domain/tipos";
import { criarTabelaDeTeste } from "../dados/tabela";

let t: Awaited<ReturnType<typeof criarTabelaDeTeste>>;
let repo: ReturnType<typeof criarRepositorio>;
let manipular: ReturnType<typeof criarManipulador>;
let agora = new Date("2026-10-10T15:00:00Z"); // 12:00 em São Paulo

async function recriar() {
  await t?.remover();
  t = await criarTabelaDeTeste();
  repo = criarRepositorio(t.doc, t.tabela);
  const proporcaoInicial: Lancamento = {
    id: gerarId(),
    tipo: "proporcao",
    data: "2026-10-01",
    criadoEm: "2026-10-01T00:00:00Z",
    criadoPor: "ariel",
    proporcao: { ariel: 50, isabella: 50 },
  };
  await repo.inicializar({
    senha: "batman",
    salt: gerarSalt(),
    proporcaoInicial,
    agora: "2026-10-01T00:00:00Z",
  });
  manipular = criarManipulador({
    repo,
    obterSegredo: criarProvedorDeSegredo(repo),
    agora: () => agora,
  });
}

beforeAll(recriar);
afterAll(async () => {
  await t?.remover();
});
beforeEach(async () => {
  agora = new Date("2026-10-10T15:00:00Z");
  await recriar();
});

async function chamar(
  metodo: string,
  caminho: string,
  opcoes: { corpo?: unknown; token?: string } = {},
) {
  const r = await manipular({
    rawPath: caminho,
    requestContext: { http: { method: metodo } },
    headers: opcoes.token ? { authorization: `Bearer ${opcoes.token}` } : {},
    body: opcoes.corpo === undefined ? null : JSON.stringify(opcoes.corpo),
  });
  return { status: r.statusCode, corpo: JSON.parse(r.body) as any };
}

async function logar(usuario = "ariel", senha = "batman"): Promise<string> {
  const r = await chamar("POST", "/api/login", { corpo: { usuario, senha } });
  expect(r.status).toBe(200);
  return r.corpo.token as string;
}

const despesa = (valor: number, extra: Record<string, unknown> = {}) => ({
  tipo: "despesa",
  descricao: "Mercado",
  valor,
  ...extra,
});

describe("POST /api/login", () => {
  it("devolve token e identidade", async () => {
    const r = await chamar("POST", "/api/login", { corpo: { usuario: "ariel", senha: "batman" } });
    expect(r.status).toBe(200);
    expect(r.corpo.usuario).toBe("ariel");
    expect(r.corpo.token.split(".")).toHaveLength(3);
  });

  it("recusa senha incorreta e usuário desconhecido com 401, sem token", async () => {
    for (const corpo of [
      { usuario: "ariel", senha: "errada" },
      { usuario: "maria", senha: "batman" },
      {},
    ]) {
      const r = await chamar("POST", "/api/login", { corpo });
      expect(r.status).toBe(401);
      expect(r.corpo.token).toBeUndefined();
    }
  });

  it("recusa login com corpo ausente", async () => {
    expect((await chamar("POST", "/api/login")).status).toBe(401);
  });
});

describe("rotas protegidas (spec auth: Rotas protegidas)", () => {
  const rotas: [string, string, unknown?][] = [
    ["GET", "/api/saldo"],
    ["GET", "/api/historico"],
    ["POST", "/api/lancamentos", despesa(100)],
    ["DELETE", "/api/lancamentos/qualquer"],
    ["POST", "/api/proporcao/preview", { proporcao: { ariel: 60, isabella: 40 } }],
    ["GET", "/api/rota-que-nao-existe"],
  ];

  it.each(rotas)("%s %s sem token responde 401", async (metodo, caminho, corpo) => {
    const r = await chamar(metodo, caminho, { corpo });
    expect(r.status).toBe(401);
  });

  it("token inválido responde 401", async () => {
    expect((await chamar("GET", "/api/saldo", { token: "lixo" })).status).toBe(401);
  });

  it("nada é gravado por uma requisição sem token", async () => {
    await chamar("POST", "/api/lancamentos", { corpo: despesa(100) });
    expect((await repo.listarLancamentos()).filter((l) => l.tipo === "despesa")).toHaveLength(0);
  });

  it("rota inexistente com token responde 404", async () => {
    const token = await logar();
    expect((await chamar("GET", "/api/nada", { token })).status).toBe(404);
  });

  it("tokens emitidos com o segredo anterior deixam de valer depois da rotação", async () => {
    const token = await logar();
    expect((await chamar("GET", "/api/saldo", { token })).status).toBe(200);
    // Rotação: outro manipulador, sem cache, com o segredo substituído no banco.
    await t.doc.send(
      new (await import("@aws-sdk/lib-dynamodb")).UpdateCommand({
        TableName: t.tabela,
        Key: { pk: "CONFIG", sk: "main" },
        UpdateExpression: "SET jwtSecret = :novo",
        ExpressionAttributeValues: { ":novo": "segredo-rotacionado" },
      }),
    );
    manipular = criarManipulador({
      repo,
      obterSegredo: criarProvedorDeSegredo(repo),
      agora: () => agora,
    });
    expect((await chamar("GET", "/api/saldo", { token })).status).toBe(401);
  });
});

describe("GET /api/saldo", () => {
  it("sem lançamentos: saldo nulo e proporção 50/50", async () => {
    const token = await logar();
    const r = await chamar("GET", "/api/saldo", { token });
    expect(r.status).toBe(200);
    expect(r.corpo.saldo).toBeNull();
    expect(r.corpo.proporcao).toEqual({ ariel: 50, isabella: 50 });
    expect(r.corpo.cicloAberto.totalDespesas).toBe(0);
  });

  it("calcula o saldo e o balanço do ciclo aberto", async () => {
    const ariel = await logar("ariel");
    const isabella = await logar("isabella");
    await chamar("POST", "/api/lancamentos", { token: ariel, corpo: despesa(10000) });
    await chamar("POST", "/api/lancamentos", { token: isabella, corpo: despesa(6000) });

    const r = await chamar("GET", "/api/saldo", { token: ariel });
    expect(r.corpo.saldo).toEqual({ devedor: "isabella", credor: "ariel", valor: 2000 });
    expect(r.corpo.cicloAberto).toMatchObject({
      totalDespesas: 16000,
      pago: { ariel: 10000, isabella: 6000 },
      parte: { ariel: 8000, isabella: 8000 },
    });
  });
});

describe("POST /api/lancamentos", () => {
  it("registra despesa assumindo o usuário do token, hoje e a proporção padrão", async () => {
    const token = await logar("isabella");
    const r = await chamar("POST", "/api/lancamentos", { token, corpo: despesa(12000) });
    expect(r.status).toBe(201);
    expect(r.corpo.saldo.saldoAssinado).toBe(-6000);

    const gravado = (await repo.listarLancamentos()).find((l) => l.id === r.corpo.id);
    expect(gravado).toMatchObject({
      tipo: "despesa",
      criadoPor: "isabella",
      pagoPor: "isabella",
      data: "2026-10-10",
      proporcao: null,
    });
  });

  it("aceita proporção customizada, data retroativa e quem pagou explícito", async () => {
    const token = await logar("ariel");
    const r = await chamar("POST", "/api/lancamentos", {
      token,
      corpo: despesa(10000, {
        pagoPor: "isabella",
        data: "2026-10-05",
        proporcao: { ariel: 70, isabella: 30 },
      }),
    });
    expect(r.status).toBe(201);
    expect(r.corpo.saldo.saldoAssinado).toBe(-7000);
  });

  it("registra acerto e proporção", async () => {
    const token = await logar("ariel");
    await chamar("POST", "/api/lancamentos", { token, corpo: despesa(10000) });
    const prop = await chamar("POST", "/api/lancamentos", {
      token,
      corpo: { tipo: "proporcao", proporcao: { ariel: 60, isabella: 40 } },
    });
    expect(prop.status).toBe(201);
    expect(prop.corpo.saldo.saldoAssinado).toBe(4000);

    const ac = await chamar("POST", "/api/lancamentos", {
      token: await logar("isabella"),
      corpo: { tipo: "acerto", valor: 4000 },
    });
    expect(ac.status).toBe(201);
    expect(ac.corpo.saldo.saldo).toBeNull();
  });

  it("recusa valor inválido", async () => {
    const token = await logar();
    for (const valor of [0, -5, 1.5, "100", null]) {
      const r = await chamar("POST", "/api/lancamentos", { token, corpo: despesa(valor as number) });
      expect(r.status).toBe(400);
      expect(r.corpo.erros.map((e: any) => e.codigo)).toContain("VALOR_INVALIDO");
    }
    expect((await repo.listarLancamentos()).filter((l) => l.tipo === "despesa")).toHaveLength(0);
  });

  it("recusa data futura", async () => {
    const token = await logar();
    const r = await chamar("POST", "/api/lancamentos", { token, corpo: despesa(100, { data: "2026-10-11" }) });
    expect(r.status).toBe(400);
    expect(r.corpo.erros[0].codigo).toBe("DATA_FUTURA");
  });

  it("recusa data anterior ao fechamento do último ciclo", async () => {
    const ariel = await logar("ariel");
    const isabella = await logar("isabella");
    await chamar("POST", "/api/lancamentos", { token: ariel, corpo: despesa(12000, { data: "2026-10-02" }) });
    const fecha = await chamar("POST", "/api/lancamentos", {
      token: isabella,
      corpo: { tipo: "acerto", valor: 6000, data: "2026-10-05" },
    });
    expect(fecha.corpo.saldo.saldo).toBeNull();

    const r = await chamar("POST", "/api/lancamentos", {
      token: ariel,
      corpo: despesa(100, { data: "2026-10-04" }),
    });
    expect(r.status).toBe(400);
    expect(r.corpo.erros[0].codigo).toBe("DATA_ANTES_DO_FECHAMENTO");
  });

  it("recusa tipo desconhecido, corpo ausente e proporção que não soma 100", async () => {
    const token = await logar();
    expect((await chamar("POST", "/api/lancamentos", { token, corpo: { tipo: "outro" } })).corpo.erros[0].codigo).toBe("TIPO_INVALIDO");
    expect((await chamar("POST", "/api/lancamentos", { token })).corpo.erros[0].codigo).toBe("CORPO_INVALIDO");
    const r = await chamar("POST", "/api/lancamentos", {
      token,
      corpo: { tipo: "proporcao", proporcao: { ariel: 70, isabella: 40 } },
    });
    expect(r.corpo.erros[0].codigo).toBe("PROPORCAO_INVALIDA");
  });

  it("não deixa o cliente escolher o autor", async () => {
    const token = await logar("ariel");
    const r = await chamar("POST", "/api/lancamentos", { token, corpo: despesa(100, { criadoPor: "isabella" }) });
    const gravado = (await repo.listarLancamentos()).find((l) => l.id === r.corpo.id);
    expect(gravado?.criadoPor).toBe("ariel");
  });

  it("usa a data de hoje no fuso de São Paulo", () => {
    expect(hojeNoFuso(new Date("2026-10-11T02:30:00Z"))).toBe("2026-10-10");
    expect(hojeNoFuso(new Date("2026-10-11T03:30:00Z"))).toBe("2026-10-11");
  });
});

describe("GET /api/historico", () => {
  it("lista do mais recente ao mais antigo com os campos dos cards", async () => {
    const ariel = await logar("ariel");
    const isabella = await logar("isabella");
    await chamar("POST", "/api/lancamentos", { token: ariel, corpo: despesa(10000, { data: "2026-10-02", descricao: "Luz" }) });
    await chamar("POST", "/api/lancamentos", { token: isabella, corpo: { tipo: "acerto", valor: 2000, data: "2026-10-03" } });
    await chamar("POST", "/api/lancamentos", {
      token: ariel,
      corpo: { tipo: "proporcao", proporcao: { ariel: 60, isabella: 40 }, data: "2026-10-04" },
    });

    const r = await chamar("GET", "/api/historico", { token: ariel });
    expect(r.status).toBe(200);
    const itens = r.corpo.itens as any[];
    // O lançamento inicial 50/50 (2026-10-01) é o mais antigo.
    expect(itens.map((i) => i.tipo)).toEqual(["proporcao", "acerto", "despesa", "proporcao"]);
    expect(itens.map((i) => i.data)).toEqual(["2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]);

    const despesaItem = itens[2];
    expect(despesaItem).toMatchObject({
      descricao: "Luz",
      pagoPor: "ariel",
      valor: 10000,
      proporcao: { ariel: 60, isabella: 40 },
      proporcaoCustomizada: false,
      partes: { ariel: 6000, isabella: 4000 },
      saldoAcumulado: 5000,
      removivel: true,
    });
    expect(itens[1].saldoAcumulado).toBe(3000);
    expect(itens[0]).toMatchObject({
      proporcaoAnterior: { ariel: 50, isabella: 50 },
      proporcao: { ariel: 60, isabella: 40 },
      saldoAntes: 3000,
      saldoDepois: 2000,
    });
  });

  it("marca cards de ciclo fechado como não removíveis", async () => {
    const ariel = await logar("ariel");
    const isabella = await logar("isabella");
    await chamar("POST", "/api/lancamentos", { token: ariel, corpo: despesa(12000, { data: "2026-10-02" }) });
    await chamar("POST", "/api/lancamentos", { token: isabella, corpo: { tipo: "acerto", valor: 6000, data: "2026-10-03" } });
    await chamar("POST", "/api/lancamentos", { token: ariel, corpo: despesa(500, { data: "2026-10-04" }) });

    const itens = (await chamar("GET", "/api/historico", { token: ariel })).corpo.itens as any[];
    expect(itens[0]).toMatchObject({ valor: 500, removivel: true, cicloFechado: false });
    expect(itens[1]).toMatchObject({ tipo: "acerto", removivel: false, fechaCiclo: true });
    expect(itens[2]).toMatchObject({ removivel: false, cicloFechado: true });
  });
});

describe("DELETE /api/lancamentos/:id", () => {
  it("remove um lançamento do ciclo aberto e devolve o saldo recalculado", async () => {
    const token = await logar();
    const criado = await chamar("POST", "/api/lancamentos", { token, corpo: despesa(10000) });
    expect(criado.corpo.saldo.saldoAssinado).toBe(5000);

    const r = await chamar("DELETE", `/api/lancamentos/${criado.corpo.id}`, { token });
    expect(r.status).toBe(200);
    expect(r.corpo.saldo.saldoAssinado).toBe(0);
    expect((await repo.listarLancamentos()).some((l) => l.id === criado.corpo.id)).toBe(false);
  });

  it("recusa remover lançamento de ciclo fechado e o acerto de fechamento", async () => {
    const ariel = await logar("ariel");
    const isabella = await logar("isabella");
    const d = await chamar("POST", "/api/lancamentos", { token: ariel, corpo: despesa(12000, { data: "2026-10-02" }) });
    const a = await chamar("POST", "/api/lancamentos", { token: isabella, corpo: { tipo: "acerto", valor: 6000, data: "2026-10-03" } });

    const rD = await chamar("DELETE", `/api/lancamentos/${d.corpo.id}`, { token: ariel });
    expect(rD.status).toBe(409);
    expect(rD.corpo.erros[0].codigo).toBe("CICLO_FECHADO");

    const rA = await chamar("DELETE", `/api/lancamentos/${a.corpo.id}`, { token: ariel });
    expect(rA.status).toBe(409);
    expect(rA.corpo.erros[0].codigo).toBe("ACERTO_DE_FECHAMENTO");

    const ids = (await repo.listarLancamentos()).map((l) => l.id);
    expect(ids).toContain(d.corpo.id);
    expect(ids).toContain(a.corpo.id);
  });

  it("responde 404 para lançamento inexistente", async () => {
    const token = await logar();
    const r = await chamar("DELETE", "/api/lancamentos/nao-existe", { token });
    expect(r.status).toBe(404);
  });

  it("remover o lançamento de proporção restaura a anterior", async () => {
    const token = await logar();
    await chamar("POST", "/api/lancamentos", { token, corpo: despesa(10000) });
    const p = await chamar("POST", "/api/lancamentos", {
      token,
      corpo: { tipo: "proporcao", proporcao: { ariel: 60, isabella: 40 } },
    });
    expect(p.corpo.saldo.saldoAssinado).toBe(4000);
    const r = await chamar("DELETE", `/api/lancamentos/${p.corpo.id}`, { token });
    expect(r.corpo.saldo.saldoAssinado).toBe(5000);
    expect(r.corpo.saldo.proporcao).toEqual({ ariel: 50, isabella: 50 });
  });
});

describe("POST /api/proporcao/preview", () => {
  it("devolve saldo antes e depois sem gravar", async () => {
    const token = await logar();
    await chamar("POST", "/api/lancamentos", { token, corpo: despesa(10000) });
    const antes = await repo.listarLancamentos();

    const r = await chamar("POST", "/api/proporcao/preview", {
      token,
      corpo: { proporcao: { ariel: 60, isabella: 40 } },
    });
    expect(r.status).toBe(200);
    expect(r.corpo).toEqual({
      proporcaoAtual: { ariel: 50, isabella: 50 },
      proporcaoNova: { ariel: 60, isabella: 40 },
      saldoAntes: 5000,
      saldoDepois: 4000,
    });
    expect(await repo.listarLancamentos()).toEqual(antes);
  });

  it("recusa proporção que não soma 100", async () => {
    const token = await logar();
    for (const proporcao of [{ ariel: 60, isabella: 60 }, { ariel: 60 }, "x", null]) {
      const r = await chamar("POST", "/api/proporcao/preview", { token, corpo: { proporcao } });
      expect(r.status).toBe(400);
      expect(r.corpo.erros[0].codigo).toBe("PROPORCAO_INVALIDA");
    }
  });
});
