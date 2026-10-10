import { gerarSegredo, validarToken } from "./jwt";
import type { Pessoa } from "../domain/tipos";

export interface FonteDeSegredo {
  garantirJwtSecret(gerar: () => string): Promise<string>;
}

/**
 * Lê o segredo do JWT do banco e o guarda por `ttlMs`, para não consultar o
 * DynamoDB a cada requisição. Rotacionar o segredo passa a valer assim que o
 * cache expira.
 */
export function criarProvedorDeSegredo(
  fonte: FonteDeSegredo,
  ttlMs = 5 * 60_000,
  relogio: () => number = Date.now,
): () => Promise<string> {
  let guardado: { valor: string; expiraEm: number } | null = null;
  return async () => {
    const agora = relogio();
    if (guardado && guardado.expiraEm > agora) return guardado.valor;
    const valor = await fonte.garantirJwtSecret(gerarSegredo);
    guardado = { valor, expiraEm: agora + ttlMs };
    return valor;
  };
}

/**
 * Autentica uma requisição pelo header `Authorization: Bearer <jwt>`.
 * `null` significa 401: sem header, formato errado, ou token inválido.
 */
export async function autenticarRequisicao(
  authorization: string | undefined,
  obterSegredo: () => Promise<string>,
  agora: Date = new Date(),
): Promise<Pessoa | null> {
  if (!authorization) return null;
  const [esquema, token, ...resto] = authorization.trim().split(/\s+/);
  if (esquema?.toLowerCase() !== "bearer" || !token || resto.length > 0) return null;
  return validarToken(token, await obterSegredo(), agora);
}
