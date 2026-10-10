import type { Proporcao } from "./tipos";

/**
 * Última proporção vista pela tela de Saldo, só em memória (some ao fechar o
 * app ou ao sair). Permite a telas que partem da home, como o Depósito, evitar
 * outra chamada a `/api/saldo` só para conhecê-la.
 */
let atual: Proporcao | null = null;

export function lembrarProporcao(proporcao: Proporcao): void {
  atual = { ...proporcao };
}

export function proporcaoLembrada(): Proporcao | null {
  return atual;
}

export function esquecerProporcao(): void {
  atual = null;
}
