export type Pessoa = "ariel" | "isabella";

export interface Proporcao {
  ariel: number;
  isabella: number;
}

export interface SaldoDescrito {
  devedor: Pessoa;
  credor: Pessoa;
  valor: number;
}

export interface Partes {
  ariel: number;
  isabella: number;
}

export interface ResumoCiclo {
  totalDespesas: number;
  pago: Partes;
  parte: Partes;
  acertosPagos: Partes;
  saldo: number;
}

/** Resposta de GET /api/saldo (valores em centavos). */
export interface Saldo {
  saldo: SaldoDescrito | null;
  /** Positivo: Isabella deve ao Ariel. Negativo: Ariel deve à Isabella. */
  saldoAssinado: number;
  proporcao: Proporcao;
  cicloAberto: ResumoCiclo;
  dataUltimoFechamento: string | null;
}

export interface ItemHistorico {
  id: string;
  tipo: "despesa" | "acerto" | "proporcao";
  data: string;
  criadoPor: Pessoa;
  descricao: string | null;
  pagoPor: Pessoa | null;
  valor: number | null;
  proporcao: Proporcao | null;
  proporcaoCustomizada: boolean;
  proporcaoAnterior: Proporcao | null;
  partes: Partes | null;
  saldoAcumulado: number;
  saldoAntes: number | null;
  saldoDepois: number | null;
  ciclo: number;
  cicloFechado: boolean;
  fechaCiclo: boolean;
  removivel: boolean;
}

export interface Previa {
  proporcaoAtual: Proporcao;
  proporcaoNova: Proporcao;
  saldoAntes: number;
  saldoDepois: number;
}

export interface ErroDaApi {
  codigo: string;
  mensagem: string;
}
