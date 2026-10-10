import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PESSOAS, type Pessoa } from "../domain/tipos";

export const VALIDADE_DIAS = 3650;
const SEGUNDOS_POR_DIA = 86_400;

interface Payload {
  sub: Pessoa;
  iat: number;
  exp: number;
}

function b64url(dado: Buffer | string): string {
  return Buffer.from(dado).toString("base64url");
}

function assinar(conteudo: string, segredo: string): Buffer {
  return createHmac("sha256", segredo).update(conteudo).digest();
}

export function gerarSegredo(): string {
  return randomBytes(32).toString("base64url");
}

/** Emite um JWT HS256 para `usuario`, válido por 3650 dias. */
export function emitirToken(
  usuario: Pessoa,
  segredo: string,
  agora: Date = new Date(),
): string {
  const iat = Math.floor(agora.getTime() / 1000);
  const payload: Payload = { sub: usuario, iat, exp: iat + VALIDADE_DIAS * SEGUNDOS_POR_DIA };
  const cabecalho = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify(payload));
  const assinatura = b64url(assinar(`${cabecalho}.${corpo}`, segredo));
  return `${cabecalho}.${corpo}.${assinatura}`;
}

/**
 * Valida assinatura, algoritmo, validade e usuário do token. Devolve a pessoa
 * do token ou `null` para qualquer token expirado, adulterado ou malformado.
 */
export function validarToken(
  token: string,
  segredo: string,
  agora: Date = new Date(),
): Pessoa | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [cabecalho, corpo, assinatura] = partes as [string, string, string];

  try {
    const header = JSON.parse(Buffer.from(cabecalho, "base64url").toString("utf8")) as {
      alg?: unknown;
    };
    if (header.alg !== "HS256") return null;

    const esperada = assinar(`${cabecalho}.${corpo}`, segredo);
    const recebida = Buffer.from(assinatura, "base64url");
    if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as Partial<Payload>;
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(agora.getTime() / 1000)) {
      return null;
    }
    if (!PESSOAS.includes(payload.sub as Pessoa)) return null;
    return payload.sub as Pessoa;
  } catch {
    return null;
  }
}
