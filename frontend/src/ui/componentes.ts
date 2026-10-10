import { ErroApi } from "../api";
import { nomePessoa } from "../formato";
import type { Pessoa } from "../tipos";
import { h } from "./dom";

export interface Contexto {
  usuario: Pessoa;
  navegar(rota: string): void;
  avisar(mensagem: string): void;
}

/** Cabeçalho das telas internas, com botão de voltar. */
export function topo(titulo: string, aoVoltar?: () => void): HTMLElement {
  return h(
    "header",
    { class: "topo" },
    aoVoltar
      ? h("button", { class: "voltar", type: "button", "aria-label": "Voltar", onclick: aoVoltar }, "‹")
      : null,
    h("h1", null, titulo),
  );
}

export function carregando(texto = "Carregando…"): HTMLElement {
  return h("p", { class: "carregando", role: "status" }, texto);
}

export function mensagemDeErro(e: unknown): string {
  return e instanceof ErroApi ? e.erros.map((x) => x.mensagem).join(" ") : "Algo deu errado. Tente de novo.";
}

/** Caixa de erro com botão de tentar de novo. */
export function caixaDeErro(e: unknown, tentarDeNovo: () => void): HTMLElement {
  return h(
    "div",
    { class: "erro", role: "alert" },
    h("p", null, mensagemDeErro(e)),
    h("button", { class: "botao secundario", type: "button", onclick: tentarDeNovo }, "Tentar de novo"),
  );
}

/** Escolha entre Ariel e Isabella (dois botões grandes). */
export function seletorPessoa(
  inicial: Pessoa,
  aoMudar?: (p: Pessoa) => void,
): { elemento: HTMLElement; valor: () => Pessoa } {
  let atual = inicial;
  const botoes = (["ariel", "isabella"] as const).map((p) =>
    h(
      "button",
      {
        type: "button",
        class: "segmento",
        role: "radio",
        dataset: { pessoa: p },
        "aria-checked": String(p === atual),
        onclick: () => {
          atual = p;
          for (const b of botoes) b.setAttribute("aria-checked", String(b.dataset.pessoa === atual));
          aoMudar?.(p);
        },
      },
      nomePessoa(p),
    ),
  );
  return {
    elemento: h("div", { class: "segmentos", role: "radiogroup" }, ...botoes),
    valor: () => atual,
  };
}

export function campo(rotulo: string, controle: HTMLElement, ajuda?: string): HTMLElement {
  return h(
    "label",
    { class: "campo" },
    h("span", { class: "rotulo" }, rotulo),
    controle,
    ajuda ? h("span", { class: "ajuda" }, ajuda) : null,
  );
}

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  confirmar: string;
  /** Ação destrutiva: o botão de confirmar fica vermelho. */
  perigo?: boolean;
}

/** Janela de confirmação. Resolve `true` só se a pessoa tocar em confirmar. */
export function confirmar(op: OpcoesConfirmacao): Promise<boolean> {
  return new Promise((resolver) => {
    const dialogo = h("dialog", { class: "dialogo" });
    const fechar = (resultado: boolean) => {
      dialogo.close();
      dialogo.remove();
      resolver(resultado);
    };
    dialogo.append(
      h("h2", null, op.titulo),
      h("p", null, op.mensagem),
      h(
        "div",
        { class: "acoes" },
        h("button", { class: "botao secundario", type: "button", dataset: { acao: "cancelar" }, onclick: () => fechar(false) }, "Cancelar"),
        h(
          "button",
          { class: op.perigo ? "botao perigo" : "botao", type: "button", dataset: { acao: "confirmar" }, onclick: () => fechar(true) },
          op.confirmar,
        ),
      ),
    );
    // Esc ou toque fora cancelam; nada é gravado.
    dialogo.addEventListener("cancel", (ev) => {
      ev.preventDefault();
      fechar(false);
    });
    dialogo.addEventListener("click", (ev) => {
      if (ev.target === dialogo) fechar(false);
    });
    document.body.append(dialogo);
    dialogo.showModal();
  });
}

let temporizador: ReturnType<typeof setTimeout> | undefined;

/** Aviso rápido no pé da tela. */
export function avisar(mensagem: string): void {
  document.querySelector(".aviso")?.remove();
  const aviso = h("div", { class: "aviso", role: "status" }, mensagem);
  document.body.append(aviso);
  clearTimeout(temporizador);
  temporizador = setTimeout(() => aviso.remove(), 3500);
}
