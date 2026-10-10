import { criarProvedorDeSegredo } from "./auth/sessao";
import { criarManipulador } from "./api/rotas";
import { criarDocClient } from "./dados/cliente";
import { criarRepositorio } from "./dados/repositorio";

const tabela = process.env.TABELA;
if (!tabela) throw new Error("Variável de ambiente TABELA não definida.");

const repo = criarRepositorio(criarDocClient(), tabela);

/** Entrada da Lambda (Function URL): roteia `/api/*`. */
export const handler = criarManipulador({
  repo,
  obterSegredo: criarProvedorDeSegredo(repo),
  agora: () => new Date(),
});
