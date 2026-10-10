import { outra } from "./formato";
import type { Partes, Pessoa, Proporcao } from "./tipos";

/**
 * Divide `valor` (centavos) entre as pessoas, com a mesma regra de
 * `backend/src/domain/divisao.ts`: a parte de quem não pagou é arredondada
 * (meio centavo para cima) e a de quem pagou é o restante, então a soma é
 * sempre exatamente `valor`.
 */
export function dividirDespesa(valor: number, pagoPor: Pessoa, proporcao: Proporcao): Partes {
  const naoPagou = outra(pagoPor);
  const parteOutra = Math.floor((valor * proporcao[naoPagou] + 50) / 100);
  return { [pagoPor]: valor - parteOutra, [naoPagou]: parteOutra } as unknown as Partes;
}

/** Percentual de `pessoa` na divisão: o que o campo de proporção mostra para quem pagou. */
export function percentualDe(pessoa: Pessoa, proporcao: Proporcao): number {
  return proporcao[pessoa];
}

/** Divisão em que `pagoPor` fica com `pct`% e a outra pessoa com o restante até 100. */
export function proporcaoDoPagador(pagoPor: Pessoa, pct: number): Proporcao {
  return { [pagoPor]: pct, [outra(pagoPor)]: 100 - pct } as unknown as Proporcao;
}

/** Valor do campo ao trocar o pagador: a divisão é mantida, só muda de quem é o percentual. */
export function converterPercentual(pct: number): number {
  return 100 - pct;
}

/** `true` para um inteiro de 0 a 100 (o que o campo de proporção aceita). */
export function percentualValido(pct: number): boolean {
  return Number.isInteger(pct) && pct >= 0 && pct <= 100;
}

/**
 * Proporção a gravar: `null` (padrão) se a divisão for igual à vigente, ou a
 * própria divisão (customizada) se diferir.
 */
export function proporcaoParaGravar(divisao: Proporcao, vigente: Proporcao): Proporcao | null {
  return divisao.ariel === vigente.ariel && divisao.isabella === vigente.isabella ? null : divisao;
}
