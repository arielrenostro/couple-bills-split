import { esquecerProporcao } from "./proporcaoVigente";
import type { Pessoa } from "./tipos";

const CHAVE_TOKEN = "contas.token";
const CHAVE_USUARIO = "contas.usuario";

// O armazenamento pode falhar (modo privado, dados bloqueados): nesse caso a
// sessão vale só até fechar o app.
const memoria = new Map<string, string>();

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave) ?? memoria.get(chave) ?? null;
  } catch {
    return memoria.get(chave) ?? null;
  }
}

function gravar(chave: string, valor: string): void {
  memoria.set(chave, valor);
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* segue só em memória */
  }
}

function apagar(chave: string): void {
  memoria.delete(chave);
  try {
    localStorage.removeItem(chave);
  } catch {
    /* nada a fazer */
  }
}

export function lerToken(): string | null {
  return ler(CHAVE_TOKEN);
}

export function lerUsuario(): Pessoa | null {
  const u = ler(CHAVE_USUARIO);
  return u === "ariel" || u === "isabella" ? u : null;
}

export function iniciarSessao(token: string, usuario: Pessoa): void {
  gravar(CHAVE_TOKEN, token);
  gravar(CHAVE_USUARIO, usuario);
}

export function encerrarSessao(): void {
  esquecerProporcao();
  apagar(CHAVE_TOKEN);
  apagar(CHAVE_USUARIO);
}
