import { gerarSalt } from "../auth/senha";
import type { Lancamento } from "../domain/tipos";
import { PROPORCAO_INICIAL } from "../domain/tipos";
import { gerarId } from "./id";
import type { Repositorio } from "./repositorio";

export const SENHA_INICIAL = "batman";

/**
 * Cria a senha inicial (`batman`, com salt aleatório) e o primeiro lançamento
 * de proporção 50/50. Idempotente: devolve `false` se já estava inicializado.
 */
export async function semear(
  repo: Repositorio,
  opcoes: { hoje: string; agora?: Date },
): Promise<boolean> {
  const agora = opcoes.agora ?? new Date();
  const proporcaoInicial: Lancamento = {
    id: gerarId(agora.getTime()),
    tipo: "proporcao",
    data: opcoes.hoje,
    criadoEm: agora.toISOString(),
    criadoPor: "ariel",
    proporcao: PROPORCAO_INICIAL,
  };
  return repo.inicializar({
    senha: SENHA_INICIAL,
    salt: gerarSalt(),
    proporcaoInicial,
    agora: agora.toISOString(),
  });
}
