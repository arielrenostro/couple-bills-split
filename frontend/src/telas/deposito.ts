import { obterSaldo } from "../api";
import { dividirDeposito, tabelaDePadroes } from "../deposito";
import { formatarMoeda, formatarPorcentagem, lerValor, nomePessoa } from "../formato";
import { lembrarProporcao, proporcaoLembrada } from "../proporcaoVigente";
import { campo, caixaDeErro, carregando, topo, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import type { Pessoa, Proporcao } from "../tipos";

const PESSOAS: Pessoa[] = ["ariel", "isabella"];

function tabelaDePadroesDeposito(proporcao: Proporcao): HTMLElement {
  return h(
    "table",
    { class: "tabela-padroes" },
    h("caption", null, "Valores prontos"),
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", { scope: "col" }, "Valor total"),
        h("th", { scope: "col" }, "Ariel"),
        h("th", { scope: "col" }, "Isabella"),
      ),
    ),
    h(
      "tbody",
      null,
      ...tabelaDePadroes(proporcao).map((l) =>
        h(
          "tr",
          null,
          h("th", { scope: "row" }, formatarMoeda(l.total)),
          h("td", null, formatarMoeda(l.ariel)),
          h("td", null, formatarMoeda(l.isabella)),
        ),
      ),
    ),
  );
}

function calculadora(proporcao: Proporcao): { elemento: HTMLElement; focar(): void } {
  const valor = h("input", {
    name: "valor",
    type: "text",
    inputMode: "decimal",
    autocomplete: "off",
    placeholder: "0,00",
  });
  const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });

  const celulas = Object.fromEntries(
    PESSOAS.map((p) => [p, h("dd", { dataset: { parte: p } }, "—")]),
  ) as Record<Pessoa, HTMLElement>;
  const partes = h(
    "dl",
    { class: "partes", "aria-live": "polite" },
    ...PESSOAS.map((p) =>
      h(
        "div",
        { class: "parte" },
        h("dt", null, nomePessoa(p), " ", h("span", { class: "pct" }, formatarPorcentagem(proporcao[p]))),
        celulas[p],
      ),
    ),
  );

  const atualizar = () => {
    const texto = valor.value.trim();
    const centavos = texto === "" ? null : lerValor(texto);
    erro.hidden = texto === "" || centavos !== null;
    erro.textContent = erro.hidden ? "" : "Informe um valor maior que zero.";
    const divisao = centavos === null ? null : dividirDeposito(centavos, proporcao);
    for (const p of PESSOAS) celulas[p].textContent = divisao ? formatarMoeda(divisao[p]) : "—";
  };
  valor.addEventListener("input", atualizar);

  return {
    elemento: h(
      "div",
      { class: "formulario" },
      h("p", { class: "ajuda" }, "Quanto cada um coloca na conta conjunta, na proporção atual."),
      campo("Valor total (R$)", valor),
      erro,
      h("section", { class: "painel" }, partes),
      h("section", { class: "painel painel-tabela" }, tabelaDePadroesDeposito(proporcao)),
    ),
    focar: () => valor.focus(),
  };
}

export function telaDeposito(ctx: Contexto): HTMLElement {
  const raiz = h("main", { class: "tela" }, topo("Depósito", () => ctx.navegar("/")));
  const corpo = h("div");
  raiz.append(corpo);

  const mostrar = (proporcao: Proporcao) => {
    const tela = calculadora(proporcao);
    corpo.replaceChildren(tela.elemento);
    // A tela ainda pode não estar no documento (o roteador a anexa depois de montá-la).
    queueMicrotask(tela.focar);
  };

  // Vindo da tela de Saldo, a proporção já está em mãos: sem nova consulta.
  // Só uma abertura direta (por exemplo, recarregar em #/deposito) a busca.
  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      const { proporcao } = await obterSaldo();
      lembrarProporcao(proporcao);
      mostrar(proporcao);
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };

  const conhecida = proporcaoLembrada();
  if (conhecida) mostrar(conhecida);
  else void carregar();
  return raiz;
}
