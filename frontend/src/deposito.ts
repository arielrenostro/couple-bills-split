import type { Partes, Proporcao } from "./tipos";

/**
 * Divide o depósito `total` (centavos) pela proporção vigente. A parte do Ariel
 * é arredondada (meio centavo para cima) e a da Isabella é o restante, então a
 * soma é sempre exatamente `total`. O dono do arredondamento é fixo para os dois
 * aparelhos mostrarem o mesmo resultado.
 */
export function dividirDeposito(total: number, proporcao: Proporcao): Partes {
  const ariel = Math.floor((total * proporcao.ariel + 50) / 100);
  return { ariel, isabella: total - ariel };
}

/** Totais da tabela de valores prontos, em centavos: R$ 1.000 a R$ 10.000, de mil em mil. */
export const VALORES_PADRAO: readonly number[] = Array.from({ length: 10 }, (_, i) => (i + 1) * 100_000);

export interface LinhaDeposito extends Partes {
  total: number;
}

/** Uma linha por valor padrão, dividida pela proporção vigente (mesma regra da calculadora). */
export function tabelaDePadroes(proporcao: Proporcao): LinhaDeposito[] {
  return VALORES_PADRAO.map((total) => ({ total, ...dividirDeposito(total, proporcao) }));
}
