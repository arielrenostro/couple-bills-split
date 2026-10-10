import type {
  Acerto,
  DataISO,
  Despesa,
  MudancaProporcao,
  Pessoa,
  Proporcao,
} from "../../src/domain/tipos";

let contador = 0;

/** Ids crescentes, como numa criação real. */
function proximoId(): string {
  contador += 1;
  return String(contador).padStart(6, "0");
}

export function reiniciarIds(): void {
  contador = 0;
}

export function despesa(opts: {
  valor: number;
  pagoPor: Pessoa;
  data?: DataISO;
  proporcao?: Proporcao | null;
  descricao?: string;
  id?: string;
}): Despesa {
  return {
    id: opts.id ?? proximoId(),
    tipo: "despesa",
    data: opts.data ?? "2026-10-01",
    criadoEm: "2026-10-01T10:00:00Z",
    criadoPor: opts.pagoPor,
    descricao: opts.descricao ?? "conta",
    valor: opts.valor,
    pagoPor: opts.pagoPor,
    proporcao: opts.proporcao ?? null,
  };
}

export function acerto(opts: {
  valor: number;
  pagoPor: Pessoa;
  data?: DataISO;
  id?: string;
}): Acerto {
  return {
    id: opts.id ?? proximoId(),
    tipo: "acerto",
    data: opts.data ?? "2026-10-01",
    criadoEm: "2026-10-01T10:00:00Z",
    criadoPor: opts.pagoPor,
    valor: opts.valor,
    pagoPor: opts.pagoPor,
  };
}

export function mudancaProporcao(opts: {
  ariel: number;
  data?: DataISO;
  id?: string;
}): MudancaProporcao {
  return {
    id: opts.id ?? proximoId(),
    tipo: "proporcao",
    data: opts.data ?? "2026-10-01",
    criadoEm: "2026-10-01T10:00:00Z",
    criadoPor: "ariel",
    proporcao: { ariel: opts.ariel, isabella: 100 - opts.ariel },
  };
}
