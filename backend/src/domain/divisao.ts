import { outraPessoa, type Pessoa, type Proporcao } from "./tipos";

export interface Partes {
  ariel: number;
  isabella: number;
}

/**
 * Divide `valor` (centavos) entre as pessoas segundo `proporcao`.
 *
 * A parte de quem não pagou é arredondada (meio centavo para cima) e a de quem
 * pagou é o restante, então `ariel + isabella` é sempre exatamente `valor`.
 */
export function dividirDespesa(
  valor: number,
  pagoPor: Pessoa,
  proporcao: Proporcao,
): Partes {
  const outra = outraPessoa(pagoPor);
  const parteOutra = Math.floor((valor * proporcao[outra] + 50) / 100);
  return {
    [pagoPor]: valor - parteOutra,
    [outra]: parteOutra,
  } as unknown as Partes;
}
