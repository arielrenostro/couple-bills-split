// Roteiro de ponta a ponta no navegador, com viewport de celular.
//
//   node e2e/roteiro.mjs <url-do-app> <pasta-das-capturas> [caminho-do-chromium]
//
// Pré-requisitos: API em execução (npm run dev:api no backend) e o app servido
// (vite preview). Usa uma tabela limpa: rode contra uma tabela recém-criada.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const [url = "http://127.0.0.1:4173", pasta = "capturas", exe] = process.argv.slice(2);
mkdirSync(pasta, { recursive: true });

const executablePath =
  exe ??
  resolve(
    homedir(),
    ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
  );

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});
const page = await context.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && erros.push(`console: ${m.text()}`));

let passos = 0;
const nbsp = (s) => s.replace(/ /g, " ");

async function ok(descricao, fn) {
  try {
    await fn();
    passos += 1;
    console.log(`  ok  ${descricao}`);
  } catch (e) {
    console.log(`FALHA ${descricao}\n      ${String(e.message).split("\n")[0]}`);
    await page.screenshot({ path: `${pasta}/falha-${passos}.png` });
    await browser.close();
    process.exit(1);
  }
}

async function texto(seletor) {
  return nbsp((await page.locator(seletor).first().innerText()).replace(/\s+/g, " ").trim());
}
async function esperaTexto(seletor, esperado) {
  await page.waitForFunction(
    ([s, e]) => document.querySelector(s)?.textContent?.replace(/ /g, " ").includes(e),
    [seletor, esperado],
    { timeout: 5000 },
  );
}
async function foto(nome) {
  await page.screenshot({ path: `${pasta}/${nome}.png`, fullPage: true });
}
async function semRolagemHorizontal() {
  const [largura, janela] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  if (largura > janela) throw new Error(`rolagem horizontal: ${largura} > ${janela}`);
}
const botao = (nome) => page.getByRole("button", { name: nome, exact: true });
async function escolherNoMenu(item) {
  await botao("Configurações").click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}
async function celulasDaTabela() {
  return page.$$eval(".tabela-ciclo tbody tr", (linhas) =>
    linhas.map((l) => [...l.children].map((c) => c.textContent.replace(/\u00a0/g, " "))),
  );
}

await page.goto(url);

await ok("abre na tela de login sem sessão", async () => {
  await page.waitForSelector("form.login");
  if (!page.url().endsWith("#/login")) throw new Error(`URL: ${page.url()}`);
  await semRolagemHorizontal();
  await foto("01-login");
});

await ok("senha errada mostra erro e não entra", async () => {
  await page.fill('input[name="senha"]', "errada");
  await botao("Entrar").click();
  await page.waitForSelector(".erro-campo:not([hidden])");
  if (!(await texto(".erro-campo")).includes("incorretos")) throw new Error(await texto(".erro-campo"));
});

await ok("login do Ariel leva ao saldo", async () => {
  await page.fill('input[name="senha"]', "batman");
  await botao("Entrar").click();
  await page.waitForSelector(".frase-saldo");
  if (!(await texto(".topo h1")).includes("Ariel")) throw new Error(await texto(".topo h1"));
});

await ok("saldo inicial: ninguém deve nada, botão de adicionar em destaque", async () => {
  if ((await texto(".frase-saldo")) !== "Ninguém deve nada") throw new Error(await texto(".frase-saldo"));
  const destaque = page.getByRole("button", { name: "+ Adicionar conta" });
  const caixa = await destaque.boundingBox();
  if (!caixa || caixa.height < 56) throw new Error(`botão pequeno: ${caixa?.height}`);
  if (!(await botao("Paguei").isDisabled())) throw new Error("Paguei deveria estar desabilitado sem saldo");
  if ((await botao("Sair").count()) !== 0) throw new Error("Sair deveria existir só dentro do menu");
  if ((await botao("Proporção").count()) !== 0) throw new Error("Proporção deveria existir só dentro do menu");
  if ((await texto(".total-valor")) !== nbsp("R$ 0,00")) throw new Error(await texto(".total-valor"));
  await semRolagemHorizontal();
  await foto("02-saldo-zerado");
});

await ok("registra conta com proporção padrão (R$ 120,00 pago pelo Ariel)", async () => {
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  await page.fill('input[name="valor"]', "120,00");
  await page.fill('input[name="descricao"]', "Mercado");
  await foto("03-compra");
  await botao("Registrar").click();
  await esperaTexto(".frase-saldo", "Isabella deve R$ 60,00 ao Ariel");
  if (!(await page.locator(".aviso").count())) throw new Error("sem aviso de sucesso");
});

await ok("registra conta customizada 70/30 paga pela Isabella", async () => {
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  await page.fill('input[name="valor"]', "100");
  await page.fill('input[name="descricao"]', "Luz");
  await page.locator('.segmento[data-pessoa="isabella"]').first().click();
  await page.locator('.segmento[data-proporcao="custom"]').click();
  await page.fill('input[name="pctAriel"]', "70");
  if (!(await texto(".resto")).includes("Ariel 70% · Isabella 30%")) throw new Error(await texto(".resto"));
  await foto("04-compra-customizada");
  await botao("Registrar").click();
  // 60,00 que a Isabella devia - 70,00 da parte do Ariel = Ariel deve 10,00.
  await esperaTexto(".frase-saldo", "Ariel deve R$ 10,00 à Isabella");
});

await ok("valor inválido na compra é recusado sem gravar", async () => {
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.waitForSelector("form.formulario");
  await page.fill('input[name="valor"]', "0");
  await page.fill('input[name="descricao"]', "Teste");
  await botao("Registrar").click();
  await page.waitForSelector(".erro-campo:not([hidden])");
  await page.getByRole("button", { name: "Voltar" }).click();
  await esperaTexto(".frase-saldo", "Ariel deve R$ 10,00 à Isabella");
});

await ok("menu: abre, fecha por Esc e por toque fora, e marca aria-expanded", async () => {
  await botao("Configurações").click();
  await page.getByRole("menuitem", { name: "Proporção", exact: true }).waitFor();
  if ((await botao("Configurações").getAttribute("aria-expanded")) !== "true") throw new Error("aria-expanded deveria ser true");
  await foto("04b-menu");
  await page.keyboard.press("Escape");
  await page.waitForSelector("dialog.menu", { state: "detached" });
  if ((await botao("Configurações").getAttribute("aria-expanded")) !== "false") throw new Error("aria-expanded deveria ser false");
  await botao("Configurações").click();
  await page.mouse.click(20, 600);
  await page.waitForSelector("dialog.menu", { state: "detached" });
  if (!page.url().endsWith("#/") && !page.url().endsWith("/")) throw new Error(`URL mudou: ${page.url()}`);
});

await ok("proporção: preview não grava; confirmar grava e reaplica ao ciclo", async () => {
  await escolherNoMenu("Proporção");
  await page.waitForSelector('input[name="pctAriel"]');
  await page.fill('input[name="pctAriel"]', "60");
  await botao("Ver prévia").click();
  await page.waitForSelector(".previa");
  await foto("05-previa-proporcao");
  if (!(await texto(".previa .antes")).includes("Ariel deve R$ 10,00 à Isabella")) throw new Error(await texto(".previa .antes"));
  if (!(await texto(".previa .depois")).includes("Ariel deve R$ 22,00 à Isabella")) throw new Error(await texto(".previa .depois"));

  // Corrigir a partir da prévia não grava nada.
  await botao("Corrigir proporção").click();
  await page.waitForSelector('input[name="pctAriel"]');
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaTexto(".frase-saldo", "Ariel deve R$ 10,00 à Isabella");

  await escolherNoMenu("Proporção");
  await page.fill('input[name="pctAriel"]', "60");
  await botao("Ver prévia").click();
  await page.waitForSelector(".previa");
  await botao("Confirmar e salvar").click();
  await esperaTexto(".frase-saldo", "Ariel deve R$ 22,00 à Isabella");
});

await ok("histórico: cards com os campos, proporção alterada visível", async () => {
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  const cartoes = await page.locator(".cartao").count();
  if (cartoes !== 4) throw new Error(`esperava 4 cartões (50/50 inicial, 2 contas, 60/40), vieram ${cartoes}`);
  const mercado = await texto('.cartao[data-tipo="despesa"]:has-text("Mercado")');
  for (const trecho of ["Quem pagou Ariel", "Valor total R$ 120,00", "Proporção 60/40", "Parte do Ariel R$ 72,00", "Parte da Isabella R$ 48,00", "Saldo acumulado"]) {
    if (!mercado.includes(trecho)) throw new Error(`faltou "${trecho}" em: ${mercado}`);
  }
  const luz = await texto('.cartao[data-tipo="despesa"]:has-text("Luz")');
  if (!luz.includes("customizada") || !luz.includes("Proporção 70/30")) throw new Error(luz);
  const prop = await texto('.cartao[data-tipo="proporcao"]');
  if (!prop.includes("→") || !prop.includes("Saldo antes") || !prop.includes("Saldo depois")) throw new Error(prop);
  await semRolagemHorizontal();
  await foto("06-historico");
});

await ok("remover pede confirmação; cancelar não remove", async () => {
  await page.locator('.cartao:has-text("Luz")').getByRole("button", { name: "Remover" }).click();
  await page.waitForSelector("dialog[open]");
  await foto("07-confirmar-remocao");
  await page.locator('dialog button[data-acao="cancelar"]').click();
  await page.waitForSelector("dialog", { state: "detached" });
  if ((await page.locator(".cartao").count()) !== 4) throw new Error("removeu mesmo cancelando");
});

await ok("confirmar a remoção apaga o lançamento e recalcula o saldo", async () => {
  await page.locator('.cartao:has-text("Luz")').getByRole("button", { name: "Remover" }).click();
  await page.waitForSelector("dialog[open]");
  await page.locator('dialog button[data-acao="confirmar"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".cartao").length === 3);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  // Sobra só o mercado (Ariel pagou 120): a Isabella deve 40% = 48,00.
  await esperaTexto(".frase-saldo", "Isabella deve R$ 48,00 ao Ariel");
  if (!(await texto(".total-valor")).includes("120,00")) throw new Error(await texto(".total-valor"));
  const esperado = [
    ["Proporção", "60%", "40%"],
    ["Pagou", nbsp("R$ 120,00"), nbsp("R$ 0,00")],
    ["Parte", nbsp("R$ 72,00"), nbsp("R$ 48,00")],
  ];
  if (JSON.stringify(await celulasDaTabela()) !== JSON.stringify(esperado)) throw new Error(JSON.stringify(await celulasDaTabela()));
  await semRolagemHorizontal();
  await foto("04c-ciclo-tabela");
});

await ok("Paguei: valor vem com o saldo e a confirmação avisa que fecha o ciclo", async () => {
  await botao("Paguei").click();
  await page.waitForSelector('input[name="valor"]');
  if ((await page.inputValue('input[name="valor"]')) !== "48,00") throw new Error(await page.inputValue('input[name="valor"]'));
  if (!(await texto('.segmento[aria-checked="true"]')).includes("Isabella")) throw new Error("pagador padrão deveria ser a Isabella");
  await foto("08-paguei");
  await botao("Registrar acerto").click();
  await page.waitForSelector("dialog[open]");
  if (!(await texto("dialog p")).includes("fecha o ciclo")) throw new Error(await texto("dialog p"));
  await foto("09-confirmar-acerto");
});

await ok("cancelar o acerto não grava nada", async () => {
  await page.locator('dialog button[data-acao="cancelar"]').click();
  await page.waitForSelector("dialog", { state: "detached" });
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await esperaTexto(".frase-saldo", "Isabella deve R$ 48,00 ao Ariel");
});

await ok("acerto parcial não fecha o ciclo", async () => {
  await botao("Paguei").click();
  await page.fill('input[name="valor"]', "8,00");
  await botao("Registrar acerto").click();
  await page.waitForSelector("dialog[open]");
  if (!(await texto("dialog p")).includes("continua aberto")) throw new Error(await texto("dialog p"));
  await page.locator('dialog button[data-acao="confirmar"]').click();
  await esperaTexto(".frase-saldo", "Isabella deve R$ 40,00 ao Ariel");
});

await ok("acerto total zera o saldo e fecha o ciclo", async () => {
  await botao("Paguei").click();
  await page.waitForSelector('input[name="valor"]');
  if ((await page.inputValue('input[name="valor"]')) !== "40,00") throw new Error(await page.inputValue('input[name="valor"]'));
  await botao("Registrar acerto").click();
  await page.waitForSelector("dialog[open]");
  await page.locator('dialog button[data-acao="confirmar"]').click();
  await esperaTexto(".frase-saldo", "Ninguém deve nada");
  await foto("10-saldo-fechado");
});

await ok("histórico: ciclo fechado sem botão remover e com etiqueta", async () => {
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  if ((await page.getByRole("button", { name: "Remover" }).count()) !== 0) throw new Error("há Remover em ciclo fechado");
  if (!(await page.locator(".etiqueta.fecha").count())) throw new Error("sem etiqueta 'Fechou o ciclo'");
  if (!(await page.locator(".separador").count())) throw new Error("sem separador de ciclos fechados");
  await foto("11-historico-fechado");
});

await ok("nova conta depois do fechamento abre um ciclo novo e removível", async () => {
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "+ Adicionar conta" }).click();
  await page.fill('input[name="valor"]', "30,00");
  await page.fill('input[name="descricao"]', "Água");
  await botao("Registrar").click();
  await esperaTexto(".frase-saldo", "Isabella deve R$ 12,00 ao Ariel");
  await botao("Histórico").click();
  await page.waitForSelector(".cartao");
  if ((await page.getByRole("button", { name: "Remover" }).count()) !== 1) throw new Error("só a conta nova deveria ser removível");
});

await ok("recarregar mantém a sessão; Sair volta ao login", async () => {
  await page.reload();
  await page.waitForSelector(".cartao");
  await page.goto(url);
  await page.waitForSelector(".frase-saldo");
  await escolherNoMenu("Sair");
  await page.waitForSelector("form.login");
  if (await page.evaluate(() => localStorage.getItem("contas.token"))) throw new Error("token não foi apagado");
});

await ok("token inválido volta ao login com aviso", async () => {
  await page.evaluate(() => {
    localStorage.setItem("contas.token", "lixo");
    localStorage.setItem("contas.usuario", "ariel");
  });
  await page.goto(url);
  await page.waitForSelector("form.login");
  if (!(await page.locator(".aviso").count())) throw new Error("sem aviso de sessão expirada");
});

await ok("sem erros no console do navegador", async () => {
  const relevantes = erros.filter((e) => !e.includes("401"));
  if (relevantes.length) throw new Error(relevantes.join(" | "));
});

await browser.close();
console.log(`\n${passos} passos ok`);
