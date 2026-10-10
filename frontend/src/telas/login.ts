import { entrar } from "../api";
import { h } from "../ui/dom";
import { mensagemDeErro, seletorPessoa } from "../ui/componentes";
import type { Pessoa } from "../tipos";

export function telaLogin(aoEntrar: (usuario: Pessoa) => void): HTMLElement {
  const quem = seletorPessoa("ariel");
  const senha = h("input", {
    type: "password",
    name: "senha",
    autocomplete: "current-password",
    "aria-label": "Senha",
    placeholder: "Senha",
    required: true,
  });
  const erro = h("p", { class: "erro-campo", role: "alert", hidden: true });
  const enviar = h("button", { class: "botao grande", type: "submit" }, "Entrar");

  const form = h(
    "form",
    {
      class: "login",
      onsubmit: async (ev: Event) => {
        ev.preventDefault();
        erro.hidden = true;
        enviar.disabled = true;
        enviar.textContent = "Entrando…";
        try {
          aoEntrar(await entrar(quem.valor(), senha.value));
        } catch (e) {
          erro.textContent = mensagemDeErro(e);
          erro.hidden = false;
          enviar.disabled = false;
          enviar.textContent = "Entrar";
          senha.focus();
        }
      },
    },
    h("h1", null, "Contas da casa"),
    h("p", { class: "sub" }, "Quem está entrando?"),
    quem.elemento,
    senha,
    erro,
    enviar,
  );

  return h("main", { class: "tela tela-login" }, form);
}
