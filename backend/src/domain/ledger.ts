import { dividirDespesa, type Partes } from "./divisao";
import {
  PROPORCAO_INICIAL,
  type DataISO,
  type Lancamento,
  type Pessoa,
  type Proporcao,
} from "./tipos";

/**
 * Convenção do saldo (centavos): positivo = Isabella deve ao Ariel,
 * negativo = Ariel deve à Isabella, zero = ninguém deve.
 */

export interface ItemHistorico {
  lancamento: Lancamento;
  /** Índice do ciclo (0 é o primeiro). */
  ciclo: number;
  /** O ciclo deste lançamento já fechou. */
  cicloFechado: boolean;
  /** Este lançamento é o acerto que zerou o saldo e fechou o ciclo. */
  fechaCiclo: boolean;
  /** Partes de cada pessoa (somente `despesa`). */
  partes: Partes | null;
  /**
   * `despesa`: proporção efetiva (customizada ou vigente no fim do ciclo).
   * `proporcao`: a nova proporção. Demais: `null`.
   */
  proporcao: Proporcao | null;
  /** Somente `proporcao`: a proporção que valia antes. */
  proporcaoAnterior: Proporcao | null;
  /** Saldo do ciclo neste ponto, com a proporção vigente neste ponto. */
  saldoAcumulado: number;
  /** Somente `proporcao`: saldo do ciclo antes e depois da mudança. */
  saldoAntes: number | null;
  saldoDepois: number | null;
}

export interface ResumoCiclo {
  totalDespesas: number;
  /** Quanto cada um pagou em despesas. */
  pago: Partes;
  /** Parte devida por cada um nas despesas. */
  parte: Partes;
  /** Quanto cada um já pagou ao outro em acertos. */
  acertosPagos: Partes;
  saldo: number;
}

export interface Historico {
  itens: ItemHistorico[];
  saldoAtual: number;
  proporcaoVigente: Proporcao;
  cicloAberto: ResumoCiclo;
  /** Data do acerto que fechou o último ciclo, se houver. */
  dataUltimoFechamento: DataISO | null;
}

export interface SaldoDescrito {
  devedor: Pessoa;
  credor: Pessoa;
  valor: number;
}

/** Traduz o saldo assinado em "X deve R$ Y a Z"; `null` quando zerado. */
export function descreverSaldo(saldo: number): SaldoDescrito | null {
  if (saldo > 0) return { devedor: "isabella", credor: "ariel", valor: saldo };
  if (saldo < 0) return { devedor: "ariel", credor: "isabella", valor: -saldo };
  return null;
}

/** Ordena por data e, em empate, pela ordem de criação (id crescente). */
export function ordenar(lancamentos: readonly Lancamento[]): Lancamento[] {
  return [...lancamentos].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return 0;
  });
}

function efeitoNoSaldo(l: Lancamento, vigente: Proporcao): number {
  switch (l.tipo) {
    case "despesa": {
      const partes = dividirDespesa(l.valor, l.pagoPor, l.proporcao ?? vigente);
      return l.pagoPor === "ariel" ? partes.isabella : -partes.ariel;
    }
    case "acerto":
      return l.pagoPor === "ariel" ? l.valor : -l.valor;
    case "proporcao":
      return 0;
  }
}

function saldoDe(
  lancamentos: readonly Lancamento[],
  vigente: Proporcao,
): number {
  let saldo = 0;
  for (const l of lancamentos) saldo += efeitoNoSaldo(l, vigente);
  return saldo;
}

function resumir(
  lancamentos: readonly Lancamento[],
  vigente: Proporcao,
): ResumoCiclo {
  const resumo: ResumoCiclo = {
    totalDespesas: 0,
    pago: { ariel: 0, isabella: 0 },
    parte: { ariel: 0, isabella: 0 },
    acertosPagos: { ariel: 0, isabella: 0 },
    saldo: saldoDe(lancamentos, vigente),
  };
  for (const l of lancamentos) {
    if (l.tipo === "despesa") {
      const partes = dividirDespesa(l.valor, l.pagoPor, l.proporcao ?? vigente);
      resumo.totalDespesas += l.valor;
      resumo.pago[l.pagoPor] += l.valor;
      resumo.parte.ariel += partes.ariel;
      resumo.parte.isabella += partes.isabella;
    } else if (l.tipo === "acerto") {
      resumo.acertosPagos[l.pagoPor] += l.valor;
    }
  }
  return resumo;
}

interface Ciclo {
  inicio: number;
  /** Índice do acerto que fechou o ciclo; `null` no ciclo aberto. */
  fechadoEm: number | null;
  fim: number;
}

/**
 * Calcula ciclos, partes e saldos a partir do histórico, sem nenhum estado
 * guardado: tudo é derivado dos lançamentos.
 */
export function calcular(lancamentos: readonly Lancamento[]): Historico {
  const ord = ordenar(lancamentos);

  // Proporção vigente depois de processar cada lançamento.
  const vigenteApos: Proporcao[] = [];
  let vigente = PROPORCAO_INICIAL;
  for (const l of ord) {
    if (l.tipo === "proporcao") vigente = l.proporcao;
    vigenteApos.push(vigente);
  }
  const vigenteEm = (i: number): Proporcao => vigenteApos[i] ?? PROPORCAO_INICIAL;

  // Ciclos: um acerto que leva o saldo exatamente a zero fecha o ciclo.
  const ciclos: Ciclo[] = [];
  const saldoNoPonto: number[] = [];
  let inicio = 0;
  for (let i = 0; i < ord.length; i++) {
    const l = ord[i] as Lancamento;
    const saldo = saldoDe(ord.slice(inicio, i + 1), vigenteEm(i));
    saldoNoPonto.push(saldo);
    if (l.tipo === "acerto" && saldo === 0) {
      ciclos.push({ inicio, fechadoEm: i, fim: i });
      inicio = i + 1;
    }
  }
  ciclos.push({ inicio, fechadoEm: null, fim: ord.length - 1 });
  const cicloAbertoDef = ciclos[ciclos.length - 1] as Ciclo;

  const itens: ItemHistorico[] = [];
  ciclos.forEach((ciclo, indiceCiclo) => {
    // Proporção que governa as despesas do ciclo: a vigente no seu fim.
    const vigenteDoCiclo =
      ciclo.fim >= ciclo.inicio ? vigenteEm(ciclo.fim) : (vigenteApos[ciclo.inicio - 1] ?? PROPORCAO_INICIAL);

    for (let i = ciclo.inicio; i <= ciclo.fim; i++) {
      const l = ord[i] as Lancamento;
      const item: ItemHistorico = {
        lancamento: l,
        ciclo: indiceCiclo,
        cicloFechado: ciclo.fechadoEm !== null,
        fechaCiclo: ciclo.fechadoEm === i,
        partes: null,
        proporcao: null,
        proporcaoAnterior: null,
        saldoAcumulado: saldoNoPonto[i] ?? 0,
        saldoAntes: null,
        saldoDepois: null,
      };
      if (l.tipo === "despesa") {
        const efetiva = l.proporcao ?? vigenteDoCiclo;
        item.proporcao = efetiva;
        item.partes = dividirDespesa(l.valor, l.pagoPor, efetiva);
      } else if (l.tipo === "proporcao") {
        item.proporcao = l.proporcao;
        item.proporcaoAnterior = i > 0 ? vigenteEm(i - 1) : PROPORCAO_INICIAL;
        item.saldoAntes = i > ciclo.inicio ? (saldoNoPonto[i - 1] ?? 0) : 0;
        item.saldoDepois = item.saldoAcumulado;
      }
      itens.push(item);
    }
  });

  const proporcaoVigente = ord.length > 0 ? vigenteEm(ord.length - 1) : PROPORCAO_INICIAL;
  const lancamentosAbertos = ord.slice(cicloAbertoDef.inicio);
  const cicloAberto = resumir(lancamentosAbertos, proporcaoVigente);

  const ultimoFechamento = [...ciclos].reverse().find((c) => c.fechadoEm !== null);
  const dataUltimoFechamento =
    ultimoFechamento && ultimoFechamento.fechadoEm !== null
      ? (ord[ultimoFechamento.fechadoEm] as Lancamento).data
      : null;

  return {
    itens,
    saldoAtual: cicloAberto.saldo,
    proporcaoVigente,
    cicloAberto,
    dataUltimoFechamento,
  };
}
