/**
 * Inicializa a tabela: senha `batman` e proporção inicial 50/50. Idempotente.
 *
 *   npx tsx scripts/inicializar.ts --tabela <nome> [--endpoint <url>]
 *
 * Sem `--endpoint`, usa a AWS com as credenciais do ambiente.
 */
import { hojeNoFuso } from "../../backend/src/api/rotas";
import { criarDocClient } from "../../backend/src/dados/cliente";
import { criarRepositorio } from "../../backend/src/dados/repositorio";
import { semear } from "../../backend/src/dados/semente";

function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const tabela = argumento("tabela") ?? process.env.TABELA;
if (!tabela) {
  console.error("Informe a tabela com --tabela <nome> (ou a variável TABELA).");
  process.exit(1);
}

const doc = criarDocClient({ endpoint: argumento("endpoint") });
const criou = await semear(criarRepositorio(doc, tabela), { hoje: hojeNoFuso(new Date()) });

console.log(
  criou
    ? `Tabela ${tabela} inicializada (senha inicial "batman", proporção 50/50).`
    : `Tabela ${tabela} já estava inicializada; nada foi alterado.`,
);
