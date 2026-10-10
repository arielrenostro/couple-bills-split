export const PESSOAS = ["ariel", "isabella"] as const;
export type Pessoa = (typeof PESSOAS)[number];

/** Percentuais inteiros por pessoa; a soma é sempre 100. */
export interface Proporcao {
  ariel: number;
  isabella: number;
}

export const PROPORCAO_INICIAL: Proporcao = { ariel: 50, isabella: 50 };

/** Data de calendário no formato AAAA-MM-DD. */
export type DataISO = string;

interface LancamentoBase {
  /** Cresce com a ordem de criação; desempata lançamentos de mesma data. */
  id: string;
  data: DataISO;
  criadoEm: string;
  criadoPor: Pessoa;
}

export interface Despesa extends LancamentoBase {
  tipo: "despesa";
  descricao: string;
  /** Valor total em centavos. */
  valor: number;
  pagoPor: Pessoa;
  /** `null` usa a proporção vigente do ciclo; um valor é uma proporção customizada. */
  proporcao: Proporcao | null;
}

/** "Paguei": `pagoPor` transferiu `valor` centavos à outra pessoa. */
export interface Acerto extends LancamentoBase {
  tipo: "acerto";
  valor: number;
  pagoPor: Pessoa;
}

/** Mudança da proporção padrão; guarda a nova proporção. */
export interface MudancaProporcao extends LancamentoBase {
  tipo: "proporcao";
  proporcao: Proporcao;
}

export type Lancamento = Despesa | Acerto | MudancaProporcao;

type CamposGerados = "id" | "criadoEm";
type SemGerados<T> = T extends unknown ? Omit<T, CamposGerados> : never;

/** Lançamento ainda sem `id` e `criadoEm`, como chega pela API. */
export type NovoLancamento = SemGerados<Lancamento>;

export function outraPessoa(pessoa: Pessoa): Pessoa {
  return pessoa === "ariel" ? "isabella" : "ariel";
}
