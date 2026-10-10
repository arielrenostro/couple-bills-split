import type { Partes, Proporcao } from "./tipos";

/**
 * Proporção que de fato aconteceu no ciclo: a parte de cada pessoa dividida
 * pelo total das contas, em décimos de ponto percentual (inteiros: 583 = 58,3%).
 * A parte da Isabella é o restante, então a soma é sempre 1000 (100,0%).
 * Devolve `null` quando o ciclo não tem contas.
 */
export function proporcaoEfetiva(parte: Partes, total: number): Proporcao | null {
  if (total <= 0) return null;
  const ariel = Math.round((parte.ariel * 1000) / total);
  return { ariel, isabella: 1000 - ariel };
}
