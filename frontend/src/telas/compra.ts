import { obterSaldo, registrar } from "../api";
import { hoje, lerValor, textoProporcao } from "../formato";
import { campo, carregando, caixaDeErro, mensagemDeErro, seletorPessoa, topo, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import type { Proporcao, Saldo } from "../tipos";

function formulario(saldo: Saldo, ctx: Contexto): HTMLElement {
  const valor = h("input", {
    name: "valor",
    type: "text",
    inputMode: "decimal",
    autocomplete: "off",
    placeholder: "0,00",
    required: true,
  });
  const descricao = h("input", {
    name: "descricao",
    type: "text",
    autocomplete: "off",
    placeholder: "Ex.: mercado, luz, internet",
    required: true,
  });
  const data = h("input", {
    name: "data",
    type: "date",
    value: hoje(),
    max: hoje(),
    ...(saldo.dataUltimoFechamento ? { min: saldo.dataUltimoFechamento } : {}),
    required: true,
  });
  const quem = seletorPessoa(ctx.usuario);

  // Proporção: padrão (a vigente) ou customizada.
  let customizada = false;
  const pctAriel = h("input", {
    name: "pctAriel",
    type: "number",
    inputMode: "numeric",
    min: 0,
    max: 100,
    step: 1,
    placeholder: "50",
  });
  const resto = h("span", { class: "resto" }, "");
  const atualizarResto = () => {
    const n = Number(pctAriel.value);
    resto.textContent =
      pctAriel.value !== "" && Number.isInteger(n) && n >= 0 && n <= 100
        ? `Ariel ${n}% · Isabella ${100 - n}%`
        : "";
  };
  pctAriel.addEventListener("input", atualizarResto);
  const blocoCustom = h("div", { class: "custom", hidden: true }, campo("% do Ariel", pctAriel), resto);

  const escolha = (valorEscolha: boolean) => {
    customizada = valorEscolha;
    blocoCustom.hidden = !customizada;
    padrao.setAttribute("aria-checked", String(!customizada));
    custom.setAttribute("aria-checked", String(customizada));
    if (customizada) pctAriel.focus();
  };
  const padrao = h(
    "button",
    { type: "button", class: "segmento", role: "radio", dataset: { proporcao: "padrao" }, "aria-checked": "true", onclick: () => escolha(false) },
    `Padrão (${textoProporcao(saldo.proporcao)})`,
  );
  const custom = h(
    "button",
    { type: "button", class: "segmento", role: "radio", dataset: { proporcao: "custom" }, "aria-checked": "false", onclick: () => escolha(true) },
    "Customizada",
  );

  const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });
  const enviar = h("button", { class: "botao grande", type: "submit" }, "Registrar");

  const mostrarErro = (texto: string) => {
    erro.textContent = texto;
    erro.hidden = false;
  };

  return h(
    "form",
    {
      class: "formulario",
      novalidate: true,
      onsubmit: async (ev: Event) => {
        ev.preventDefault();
        erro.hidden = true;

        const centavos = lerValor(valor.value);
        if (centavos === null) return mostrarErro("Informe um valor maior que zero.");
        if (descricao.value.trim() === "") return mostrarErro("Informe a descrição da conta.");

        let proporcao: Proporcao | null = null;
        if (customizada) {
          const n = Number(pctAriel.value);
          if (pctAriel.value === "" || !Number.isInteger(n) || n < 0 || n > 100) {
            return mostrarErro("Informe o percentual do Ariel, de 0 a 100.");
          }
          proporcao = { ariel: n, isabella: 100 - n };
        }

        enviar.disabled = true;
        enviar.textContent = "Registrando…";
        try {
          await registrar({
            tipo: "despesa",
            descricao: descricao.value.trim(),
            valor: centavos,
            pagoPor: quem.valor(),
            data: data.value,
            proporcao,
          });
          ctx.avisar("Conta registrada.");
          ctx.navegar("/");
        } catch (e) {
          mostrarErro(mensagemDeErro(e));
          enviar.disabled = false;
          enviar.textContent = "Registrar";
        }
      },
    },
    campo("Valor (R$)", valor),
    campo("Descrição", descricao),
    h("div", { class: "campo" }, h("span", { class: "rotulo" }, "Quem pagou"), quem.elemento),
    campo("Data", data),
    h(
      "div",
      { class: "campo" },
      h("span", { class: "rotulo" }, "Proporção"),
      h("div", { class: "segmentos", role: "radiogroup" }, padrao, custom),
      blocoCustom,
    ),
    erro,
    enviar,
  );
}

export function telaCompra(ctx: Contexto): HTMLElement {
  const raiz = h("main", { class: "tela" }, topo("Adicionar conta", () => ctx.navegar("/")));
  const corpo = h("div", null, carregando());
  raiz.append(corpo);

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      corpo.replaceChildren(formulario(await obterSaldo(), ctx));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };
  void carregar();
  return raiz;
}
