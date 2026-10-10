import { PESSOAS, type Pessoa } from "../domain/tipos";
import type { Credencial } from "../dados/repositorio";
import { verificarSenha } from "./senha";

export interface FonteDeCredencial {
  lerCredencial(): Promise<Credencial | null>;
}

/**
 * Confere usuário e senha. Devolve a pessoa autenticada ou `null`, sem
 * distinguir "usuário desconhecido" de "senha incorreta" para quem chama.
 */
export async function autenticar(
  fonte: FonteDeCredencial,
  usuario: unknown,
  senha: unknown,
): Promise<Pessoa | null> {
  if (typeof usuario !== "string" || typeof senha !== "string") return null;
  if (!PESSOAS.includes(usuario as Pessoa)) return null;

  const credencial = await fonte.lerCredencial();
  if (!credencial) return null;
  return verificarSenha(senha, credencial) ? (usuario as Pessoa) : null;
}
