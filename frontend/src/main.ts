import "./estilos.css";
import { definirAoPerderSessao } from "./api";
import { encerrarSessao, lerToken, lerUsuario } from "./sessao";
import { telaAcerto } from "./telas/acerto";
import { telaCompra } from "./telas/compra";
import { telaDeposito } from "./telas/deposito";
import { telaHistorico } from "./telas/historico";
import { telaLogin } from "./telas/login";
import { telaProporcao } from "./telas/proporcao";
import { telaSaldo } from "./telas/saldo";
import { avisar, type Contexto } from "./ui/componentes";

const raiz = document.getElementById("app") as HTMLElement;

function rotaAtual(): string {
  const r = location.hash.replace(/^#/, "");
  return r === "" ? "/" : r;
}

function navegar(rota: string): void {
  if (rotaAtual() === rota) renderizar();
  else location.hash = rota;
}

function sair(): void {
  encerrarSessao();
  navegar("/login");
}

function renderizar(): void {
  const rota = rotaAtual();
  const usuario = lerToken() ? lerUsuario() : null;

  if (!usuario) {
    if (rota !== "/login") return navegar("/login");
    raiz.replaceChildren(telaLogin(() => navegar("/")));
    return;
  }
  if (rota === "/login") return navegar("/");

  const ctx: Contexto = { usuario, navegar, avisar };
  const telas: Record<string, () => HTMLElement> = {
    "/": () => telaSaldo(ctx, sair),
    "/compra": () => telaCompra(ctx),
    "/historico": () => telaHistorico(ctx),
    "/proporcao": () => telaProporcao(ctx),
    "/acerto": () => telaAcerto(ctx),
    "/deposito": () => telaDeposito(ctx),
  };
  const tela = telas[rota] ?? telas["/"]!;
  raiz.replaceChildren(tela());
  window.scrollTo(0, 0);
}

definirAoPerderSessao(() => {
  avisar("Sua sessão expirou. Entre de novo.");
  navegar("/login");
});
window.addEventListener("hashchange", renderizar);
renderizar();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* o app funciona sem service worker */
    });
  });
}
