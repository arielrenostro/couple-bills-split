import { obterSaldo } from "../api";
import { formatarMoeda, fraseSaldo, nomePessoa, textoProporcao } from "../formato";
import { caixaDeErro, carregando, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import type { Saldo } from "../tipos";

function linha(rotulo: string, valor: string): HTMLElement {
  return h("div", { class: "linha" }, h("dt", null, rotulo), h("dd", null, valor));
}

function conteudo(s: Saldo, ctx: Contexto): HTMLElement {
  const c = s.cicloAberto;
  const devedor = s.saldo ? nomePessoa(s.saldo.devedor) : null;

  return h(
    "div",
    { class: "saldo" },
    h(
      "section",
      { class: s.saldo ? "painel saldo-principal" : "painel saldo-principal quitado" },
      h("p", { class: "rotulo" }, s.saldo ? "Saldo" : "Tudo certo"),
      h("p", { class: "frase-saldo", dataset: { devedor: devedor ?? "" } }, fraseSaldo(s.saldo)),
    ),
    h(
      "button",
      { class: "botao grande destaque", type: "button", onclick: () => ctx.navegar("/compra") },
      "+ Adicionar conta",
    ),
    h(
      "div",
      { class: "atalhos" },
      h(
        "button",
        {
          class: "botao secundario",
          type: "button",
          disabled: !s.saldo,
          onclick: () => ctx.navegar("/acerto"),
        },
        "Paguei",
      ),
      h("button", { class: "botao secundario", type: "button", onclick: () => ctx.navegar("/historico") }, "Histórico"),
      h("button", { class: "botao secundario", type: "button", onclick: () => ctx.navegar("/proporcao") }, "Proporção"),
    ),
    h(
      "section",
      { class: "painel" },
      h("h2", null, "Ciclo atual"),
      h(
        "dl",
        null,
        linha("Proporção (Ariel/Isabella)", textoProporcao(s.proporcao)),
        linha("Total das contas", formatarMoeda(c.totalDespesas)),
        linha("Ariel pagou", formatarMoeda(c.pago.ariel)),
        linha("Isabella pagou", formatarMoeda(c.pago.isabella)),
        linha("Parte do Ariel", formatarMoeda(c.parte.ariel)),
        linha("Parte da Isabella", formatarMoeda(c.parte.isabella)),
      ),
    ),
  );
}

export function telaSaldo(ctx: Contexto, aoSair: () => void): HTMLElement {
  const raiz = h("main", { class: "tela" });
  const corpo = h("div", null, carregando());

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      corpo.replaceChildren(conteudo(await obterSaldo(), ctx));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };

  raiz.append(
    h(
      "header",
      { class: "topo" },
      h("h1", null, `Olá, ${nomePessoa(ctx.usuario)}`),
      h("button", { class: "sair", type: "button", onclick: aoSair }, "Sair"),
    ),
    corpo,
  );
  void carregar();
  return raiz;
}
