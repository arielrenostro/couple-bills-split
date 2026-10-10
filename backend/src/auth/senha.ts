import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** `sha256(senha + salt)` em hexadecimal, como gravado no item de configuração. */
export function calcularHashSenha(senha: string, salt: string): string {
  return createHash("sha256").update(senha + salt).digest("hex");
}

export function gerarSalt(): string {
  return randomBytes(16).toString("hex");
}

/** Compara a senha informada com o `{ salt, hash }` gravado, em tempo constante. */
export function verificarSenha(
  senha: string,
  config: { salt: string; hash: string },
): boolean {
  const calculado = Buffer.from(calcularHashSenha(senha, config.salt), "utf8");
  const gravado = Buffer.from(config.hash, "utf8");
  if (calculado.length !== gravado.length) return false;
  return timingSafeEqual(calculado, gravado);
}
