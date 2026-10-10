// Verifica o lado PWA: manifest, ícones, instalabilidade, service worker,
// que /api nunca vai para o cache e que o app abre sem rede.
//
//   node e2e/pwa.mjs <url-do-app> [caminho-do-chromium]
//
// Exige o build de produção servido (vite preview) e a API local em execução.
import { chromium } from "playwright-core";
import { homedir } from "node:os";
import { resolve } from "node:path";

const [url = "http://127.0.0.1:4173", exe] = process.argv.slice(2);
const executablePath =
  exe ??
  resolve(
    homedir(),
    ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
  );

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
const page = await context.newPage();
let passos = 0;

async function ok(descricao, fn) {
  try {
    await fn();
    passos += 1;
    console.log(`  ok  ${descricao}`);
  } catch (e) {
    console.log(`FALHA ${descricao}\n      ${String(e.message).split("\n")[0]}`);
    await browser.close();
    process.exit(1);
  }
}

await page.goto(url);
await page.waitForSelector("form.login");

await ok("manifest válido, em tela cheia, com ícones 192 e 512 acessíveis", async () => {
  const href = await page.getAttribute('link[rel="manifest"]', "href");
  const manifest = await (await page.request.get(new URL(href, url).href)).json();
  if (manifest.display !== "standalone") throw new Error(`display: ${manifest.display}`);
  if (manifest.start_url !== "/" || manifest.lang !== "pt-BR") throw new Error("start_url/lang");
  const tamanhos = manifest.icons.map((i) => i.sizes);
  for (const t of ["192x192", "512x512"]) if (!tamanhos.includes(t)) throw new Error(`falta ícone ${t}`);
  for (const icone of manifest.icons) {
    const r = await page.request.get(new URL(icone.src, url).href);
    if (!r.ok() || r.headers()["content-type"] !== "image/png") throw new Error(`ícone ${icone.src}: ${r.status()}`);
  }
  if (!manifest.icons.some((i) => i.purpose === "maskable")) throw new Error("sem ícone maskable");
});

await ok("ícone do iOS e tema declarados no HTML", async () => {
  if (!(await page.locator('link[rel="apple-touch-icon"]').count())) throw new Error("sem apple-touch-icon");
  if (!(await page.locator('meta[name="theme-color"]').count())) throw new Error("sem theme-color");
  const viewport = await page.getAttribute('meta[name="viewport"]', "content");
  if (!viewport.includes("viewport-fit=cover")) throw new Error(viewport);
});

await ok("o navegador não aponta erros de instalabilidade", async () => {
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  if (installabilityErrors.length) throw new Error(JSON.stringify(installabilityErrors));
});

await ok("service worker registrado e controlando a página", async () => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 5000 });
});

await ok("login funciona e o shell fica no cache", async () => {
  await page.click('.segmento[data-pessoa="ariel"]');
  await page.fill('input[name="senha"]', "batman");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForSelector(".frase-saldo");
  const chaves = await page.evaluate(async () => {
    const c = await caches.open("contas-v3");
    return (await c.keys()).map((r) => new URL(r.url).pathname);
  });
  if (!chaves.includes("/")) throw new Error(`sem "/" no cache: ${chaves}`);
  if (!chaves.some((c) => c.startsWith("/assets/") && c.endsWith(".js"))) throw new Error(`sem JS no cache: ${chaves}`);
});

await ok("/api/* nunca entra no cache", async () => {
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await page.waitForSelector(".cartao");
  const chaves = await page.evaluate(async () => {
    const todas = [];
    for (const nome of await caches.keys()) {
      const c = await caches.open(nome);
      todas.push(...(await c.keys()).map((r) => new URL(r.url).pathname));
    }
    return todas;
  });
  const api = chaves.filter((c) => c.startsWith("/api/"));
  if (api.length) throw new Error(`no cache: ${api}`);
});

await ok("sem rede, o app abre e avisa que está sem conexão (sem mostrar saldo velho)", async () => {
  await context.setOffline(true);
  await page.goto(url);
  await page.waitForSelector(".erro");
  const texto = await page.locator(".erro").innerText();
  if (!texto.includes("Sem conexão")) throw new Error(texto);
  if (await page.locator(".frase-saldo").count()) throw new Error("mostrou saldo sem rede");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await page.waitForSelector(".frase-saldo");
});

await browser.close();
console.log(`\n${passos} passos ok`);
