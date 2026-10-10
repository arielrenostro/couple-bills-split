import { encerrarSessao, iniciarSessao, lerToken } from "./sessao";
import type { ErroDaApi, ItemHistorico, Pessoa, Previa, Proporcao, Saldo } from "./tipos";

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly erros: ErroDaApi[],
  ) {
    super(erros[0]?.mensagem ?? "Algo deu errado.");
  }
}

/** Chamado quando a API recusa o token; a tela de login assume. */
let aoPerderSessao: () => void = () => {};
export function definirAoPerderSessao(fn: () => void): void {
  aoPerderSessao = fn;
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const token = lerToken();
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(0, [{ codigo: "SEM_REDE", mensagem: "Sem conexão. Tente de novo." }]);
  }

  let dados: any = null;
  try {
    dados = await resposta.json();
  } catch {
    /* corpo vazio ou não-JSON */
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== "/api/login") {
      encerrarSessao();
      aoPerderSessao();
    }
    throw new ErroApi(
      resposta.status,
      dados?.erros ?? [{ codigo: "ERRO", mensagem: "Algo deu errado. Tente de novo." }],
    );
  }
  return dados as T;
}

export async function entrar(usuario: Pessoa, senha: string): Promise<Pessoa> {
  const r = await chamar<{ token: string; usuario: Pessoa }>("POST", "/api/login", { usuario, senha });
  iniciarSessao(r.token, r.usuario);
  return r.usuario;
}

export const obterSaldo = () => chamar<Saldo>("GET", "/api/saldo");

export const obterHistorico = () =>
  chamar<{ itens: ItemHistorico[] }>("GET", "/api/historico").then((r) => r.itens);

export interface NovaDespesa {
  tipo: "despesa";
  descricao: string;
  valor: number;
  pagoPor: Pessoa;
  data: string;
  proporcao: Proporcao | null;
}
export interface NovoAcerto {
  tipo: "acerto";
  valor: number;
  pagoPor: Pessoa;
  data: string;
}
export interface NovaProporcao {
  tipo: "proporcao";
  proporcao: Proporcao;
  data: string;
}

export const registrar = (lancamento: NovaDespesa | NovoAcerto | NovaProporcao) =>
  chamar<{ id: string; saldo: Saldo }>("POST", "/api/lancamentos", lancamento);

export const remover = (id: string) =>
  chamar<{ saldo: Saldo }>("DELETE", `/api/lancamentos/${encodeURIComponent(id)}`);

export const previaProporcao = (proporcao: Proporcao) =>
  chamar<Previa>("POST", "/api/proporcao/preview", { proporcao });
