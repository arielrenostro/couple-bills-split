// Sobe o ambiente local inteiro com um comando: `npm run dev`.
//
//   1. DynamoDB Local no Docker (127.0.0.1:8000), se ainda não estiver de pé
//   2. API local na :8787 (tabela "contas-dev", senha "batman")
//   3. Vite na :5173, com proxy de /api para a API
//
// Ctrl+C encerra a API e o Vite. O container do DynamoDB continua rodando (os
// testes do backend precisam dele); pare com `docker stop contas-dynamodb-local`.
import { spawn, spawnSync } from "node:child_process";
import { connect } from "node:net";

const raiz = new URL("..", import.meta.url).pathname;

function portaAberta(porta) {
  return new Promise((resolver) => {
    const s = connect({ port: porta, host: "127.0.0.1" });
    s.once("connect", () => (s.destroy(), resolver(true)));
    s.once("error", () => resolver(false));
  });
}

async function esperarPorta(porta, tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    if (await portaAberta(porta)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

if (!(await portaAberta(8000))) {
  console.log("[dev] subindo o DynamoDB Local (Docker)…");
  const r = spawnSync("npm", ["run", "db:local", "-w", "backend"], { cwd: raiz, stdio: "inherit" });
  if (r.status !== 0 || !(await esperarPorta(8000))) {
    console.error("[dev] DynamoDB Local indisponível. O Docker está rodando?");
    process.exit(1);
  }
}

const filhos = [];
let encerrando = false;

function encerrar(codigo) {
  if (encerrando) return;
  encerrando = true;
  for (const f of filhos) {
    try {
      process.kill(-f.pid, "SIGTERM"); // o grupo todo: npm -> tsx/vite -> node
    } catch {}
  }
  setTimeout(() => process.exit(codigo), 300);
}

function iniciar(nome, comando, argumentos) {
  const f = spawn(comando, argumentos, { cwd: raiz, detached: true, env: { ...process.env, FORCE_COLOR: "1" } });
  const prefixar = (saida) => (dados) => {
    for (const linha of String(dados).split("\n")) if (linha.trim()) saida.write(`[${nome}] ${linha}\n`);
  };
  f.stdout.on("data", prefixar(process.stdout));
  f.stderr.on("data", prefixar(process.stderr));
  f.on("exit", (codigo) => {
    if (!encerrando) console.error(`[${nome}] encerrou (código ${codigo}); parando o resto.`);
    encerrar(codigo ?? 1);
  });
  filhos.push(f);
}

process.on("SIGINT", () => encerrar(0));
process.on("SIGTERM", () => encerrar(0));

iniciar("api", "npm", ["run", "dev:api", "-w", "backend"]);
if (!(await esperarPorta(8787))) {
  console.error("[dev] a API não subiu na :8787.");
  encerrar(1);
} else {
  iniciar("web", "npm", ["run", "dev", "-w", "frontend", "--", "--host", "127.0.0.1"]);
  console.log("\n[dev] pronto: http://127.0.0.1:5173 (senha: batman)\n");
}
