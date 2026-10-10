import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { autenticar } from "../../src/auth/autenticacao";
import { calcularHashSenha, gerarSalt, verificarSenha } from "../../src/auth/senha";
import { emitirToken, gerarSegredo, validarToken, VALIDADE_DIAS } from "../../src/auth/jwt";
import { autenticarRequisicao, criarProvedorDeSegredo } from "../../src/auth/sessao";

const SALT = "12345";
const fonte = {
  lerCredencial: async () => ({ salt: SALT, hash: calcularHashSenha("batman", SALT) }),
};

describe("senha (spec auth: Senha armazenada com hash e salt)", () => {
  it("o hash é sha256(senha + salt) em hexadecimal", () => {
    expect(calcularHashSenha("batman", "12345")).toBe(
      "430d8b5fdc5701551186fd1b8596f64b66c4d035acd68a47d4c0eefe4223e52d",
    );
  });

  it("aceita a senha correta e recusa a incorreta", () => {
    const config = { salt: SALT, hash: calcularHashSenha("batman", SALT) };
    expect(verificarSenha("batman", config)).toBe(true);
    expect(verificarSenha("robin", config)).toBe(false);
    expect(verificarSenha("", config)).toBe(false);
    expect(verificarSenha("batman ", config)).toBe(false);
  });

  it("um hash de tamanho diferente nunca confere (sem lançar)", () => {
    expect(verificarSenha("batman", { salt: SALT, hash: "curto" })).toBe(false);
  });

  it("gera salts diferentes a cada chamada", () => {
    expect(gerarSalt()).not.toBe(gerarSalt());
  });
});

describe("login (spec auth: Login com usuário e senha única)", () => {
  it("login válido devolve a pessoa", async () => {
    expect(await autenticar(fonte, "ariel", "batman")).toBe("ariel");
    expect(await autenticar(fonte, "isabella", "batman")).toBe("isabella");
  });

  it("senha incorreta é recusada", async () => {
    expect(await autenticar(fonte, "ariel", "errada")).toBeNull();
  });

  it("usuário desconhecido é recusado, mesmo com a senha certa", async () => {
    expect(await autenticar(fonte, "maria", "batman")).toBeNull();
    expect(await autenticar(fonte, "ARIEL", "batman")).toBeNull();
  });

  it("entradas que não são texto são recusadas", async () => {
    expect(await autenticar(fonte, undefined, "batman")).toBeNull();
    expect(await autenticar(fonte, "ariel", 123)).toBeNull();
  });

  it("sem credencial gravada ninguém entra", async () => {
    expect(await autenticar({ lerCredencial: async () => null }, "ariel", "batman")).toBeNull();
  });
});

describe("JWT (spec auth: Sessão por JWT de longa duração)", () => {
  const segredo = "segredo-de-teste";
  const agora = new Date("2026-10-10T12:00:00Z");

  it("token válido devolve o usuário", () => {
    expect(validarToken(emitirToken("ariel", segredo, agora), segredo, agora)).toBe("ariel");
  });

  it("o token usa HS256 e expira em 3650 dias", () => {
    const [cabecalho, corpo] = emitirToken("isabella", segredo, agora).split(".") as [string, string];
    expect(JSON.parse(Buffer.from(cabecalho, "base64url").toString())).toEqual({
      alg: "HS256",
      typ: "JWT",
    });
    const payload = JSON.parse(Buffer.from(corpo, "base64url").toString());
    expect(payload.sub).toBe("isabella");
    expect(payload.exp - payload.iat).toBe(VALIDADE_DIAS * 86_400);
    expect(VALIDADE_DIAS).toBe(3650);
  });

  it("vale quase dez anos e expira depois disso", () => {
    const token = emitirToken("ariel", segredo, agora);
    const quaseNoFim = new Date(agora.getTime() + (VALIDADE_DIAS * 86_400 - 60) * 1000);
    const depois = new Date(agora.getTime() + (VALIDADE_DIAS * 86_400 + 1) * 1000);
    expect(validarToken(token, segredo, quaseNoFim)).toBe("ariel");
    expect(validarToken(token, segredo, depois)).toBeNull();
  });

  it("recusa token adulterado no corpo", () => {
    const [h, , s] = emitirToken("ariel", segredo, agora).split(".") as [string, string, string];
    const corpoFalso = Buffer.from(
      JSON.stringify({ sub: "isabella", iat: 0, exp: 9_999_999_999 }),
    ).toString("base64url");
    expect(validarToken(`${h}.${corpoFalso}.${s}`, segredo, agora)).toBeNull();
  });

  it("recusa token assinado com outro segredo", () => {
    expect(validarToken(emitirToken("ariel", "outro", agora), segredo, agora)).toBeNull();
  });

  it("recusa alg diferente de HS256, incluindo none", () => {
    const corpo = Buffer.from(
      JSON.stringify({ sub: "ariel", iat: 0, exp: 9_999_999_999 }),
    ).toString("base64url");
    const semAssinatura = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    expect(validarToken(`${semAssinatura}.${corpo}.`, segredo, agora)).toBeNull();

    const hs512 = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
    const assinatura = createHmac("sha256", segredo).update(`${hs512}.${corpo}`).digest("base64url");
    expect(validarToken(`${hs512}.${corpo}.${assinatura}`, segredo, agora)).toBeNull();
  });

  it("recusa usuário fora de ariel e isabella, mesmo com assinatura válida", () => {
    const cabecalho = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const corpo = Buffer.from(
      JSON.stringify({ sub: "maria", iat: 0, exp: 9_999_999_999 }),
    ).toString("base64url");
    const assinatura = createHmac("sha256", segredo).update(`${cabecalho}.${corpo}`).digest("base64url");
    expect(validarToken(`${cabecalho}.${corpo}.${assinatura}`, segredo, agora)).toBeNull();
  });

  it.each(["", "abc", "a.b", "a.b.c.d", "....", "ñ.ñ.ñ"])("recusa token malformado %j", (token) => {
    expect(validarToken(token, segredo, agora)).toBeNull();
  });

  it("rotacionar o segredo invalida os tokens anteriores", () => {
    const token = emitirToken("ariel", "segredo-antigo", agora);
    expect(validarToken(token, "segredo-antigo", agora)).toBe("ariel");
    expect(validarToken(token, "segredo-novo", agora)).toBeNull();
  });

  it("gera segredos diferentes", () => {
    expect(gerarSegredo()).not.toBe(gerarSegredo());
  });
});

describe("sessão por requisição (spec auth: Rotas protegidas)", () => {
  const segredo = "segredo-de-teste";
  const obter = async () => segredo;

  it("aceita Bearer com token válido", async () => {
    const token = emitirToken("ariel", segredo);
    expect(await autenticarRequisicao(`Bearer ${token}`, obter)).toBe("ariel");
    expect(await autenticarRequisicao(`bearer ${token}`, obter)).toBe("ariel");
  });

  it("sem header, é 401", async () => {
    expect(await autenticarRequisicao(undefined, obter)).toBeNull();
    expect(await autenticarRequisicao("", obter)).toBeNull();
  });

  it("esquema errado ou token faltando, é 401", async () => {
    const token = emitirToken("ariel", segredo);
    expect(await autenticarRequisicao(`Basic ${token}`, obter)).toBeNull();
    expect(await autenticarRequisicao("Bearer", obter)).toBeNull();
    expect(await autenticarRequisicao(`Bearer ${token} extra`, obter)).toBeNull();
  });

  it("token inválido é 401", async () => {
    expect(await autenticarRequisicao("Bearer lixo", obter)).toBeNull();
    expect(await autenticarRequisicao(`Bearer ${emitirToken("ariel", "outro")}`, obter)).toBeNull();
  });
});

describe("provedor do segredo", () => {
  it("guarda o segredo pelo prazo e relê depois dele (rotação)", async () => {
    let atual = "v1";
    let leituras = 0;
    const fonteSegredo = {
      garantirJwtSecret: async () => {
        leituras += 1;
        return atual;
      },
    };
    let agora = 1_000;
    const obter = criarProvedorDeSegredo(fonteSegredo, 5_000, () => agora);

    expect(await obter()).toBe("v1");
    atual = "v2";
    agora += 4_000;
    expect(await obter()).toBe("v1"); // ainda em cache
    expect(leituras).toBe(1);
    agora += 2_000;
    expect(await obter()).toBe("v2"); // cache expirou: rotação passa a valer
    expect(leituras).toBe(2);
  });
});
