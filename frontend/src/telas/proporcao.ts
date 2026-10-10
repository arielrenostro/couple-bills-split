import { obterSaldo, previaProporcao, registrar } from "../api";
import { fraseSaldoAssinado, hoje, textoProporcao } from "../formato";
import { campo, caixaDeErro, carregando, mensagemDeErro, topo, type Contexto } from "../ui/componentes";
import { h } from "../ui/dom";
import type { Previa, Proporcao, Saldo } from "../tipos";

export function telaProporcao(ctx: Contexto): HTMLElement {
  const raiz = h("main", { class: "tela" }, topo("Proporção", () => ctx.navegar("/")));
  const corpo = h("div", null, carregando());
  raiz.append(corpo);

  const mostrarPrevia = (previa: Previa) => {
    const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });
    const salvar = h("button", { class: "botao grande", type: "button" }, "Confirmar e salvar");
    salvar.addEventListener("click", async () => {
      salvar.disabled = true;
      salvar.textContent = "Salvando…";
      erro.hidden = true;
      try {
        await registrar({ tipo: "proporcao", proporcao: previa.proporcaoNova, data: hoje() });
        ctx.avisar("Proporção atualizada.");
        ctx.navegar("/");
      } catch (e) {
        erro.textContent = mensagemDeErro(e);
        erro.hidden = false;
        salvar.disabled = false;
        salvar.textContent = "Confirmar e salvar";
      }
    });

    corpo.replaceChildren(
      h(
        "section",
        { class: "painel previa" },
        h("h2", null, "Prévia"),
        h("p", { class: "mudanca" }, `${textoProporcao(previa.proporcaoAtual)} → ${textoProporcao(previa.proporcaoNova)}`),
        h("p", { class: "rotulo" }, "Saldo hoje"),
        h("p", { class: "antes" }, fraseSaldoAssinado(previa.saldoAntes)),
        h("p", { class: "rotulo" }, "Saldo com a nova proporção"),
        h("p", { class: "depois" }, fraseSaldoAssinado(previa.saldoDepois)),
        h(
          "p",
          { class: "ajuda" },
          "Vale para as contas do ciclo atual sem proporção customizada. Ciclos fechados não mudam.",
        ),
      ),
      erro,
      salvar,
      h("button", { class: "botao secundario", type: "button", onclick: () => void carregar() }, "Corrigir proporção"),
    );
  };

  const formulario = (saldo: Saldo) => {
    const pct = h("input", {
      name: "pctAriel",
      type: "number",
      inputMode: "numeric",
      min: 0,
      max: 100,
      step: 1,
      value: String(saldo.proporcao.ariel),
      required: true,
    });
    const resto = h("span", { class: "resto" }, "");
    const atualizar = () => {
      const n = Number(pct.value);
      resto.textContent =
        pct.value !== "" && Number.isInteger(n) && n >= 0 && n <= 100
          ? `Ariel ${n}% · Isabella ${100 - n}%`
          : "";
    };
    pct.addEventListener("input", atualizar);
    atualizar();

    const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });
    const ver = h("button", { class: "botao grande", type: "submit" }, "Ver prévia");

    return h(
      "form",
      {
        class: "formulario",
        novalidate: true,
        onsubmit: async (ev: Event) => {
          ev.preventDefault();
          erro.hidden = true;
          const n = Number(pct.value);
          if (pct.value === "" || !Number.isInteger(n) || n < 0 || n > 100) {
            erro.textContent = "Informe o percentual do Ariel, de 0 a 100.";
            erro.hidden = false;
            return;
          }
          const nova: Proporcao = { ariel: n, isabella: 100 - n };
          ver.disabled = true;
          ver.textContent = "Calculando…";
          try {
            mostrarPrevia(await previaProporcao(nova));
          } catch (e) {
            erro.textContent = mensagemDeErro(e);
            erro.hidden = false;
            ver.disabled = false;
            ver.textContent = "Ver prévia";
          }
        },
      },
      h("p", { class: "contexto" }, `Proporção atual: ${textoProporcao(saldo.proporcao)} (Ariel/Isabella).`),
      campo("Nova proporção: % do Ariel", pct, "A Isabella fica com o restante."),
      resto,
      erro,
      ver,
    );
  };

  const carregar = async () => {
    corpo.replaceChildren(carregando());
    try {
      corpo.replaceChildren(formulario(await obterSaldo()));
    } catch (e) {
      corpo.replaceChildren(caixaDeErro(e, carregar));
    }
  };
  void carregar();
  return raiz;
}
