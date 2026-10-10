import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  GetCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { calcularHashSenha } from "../auth/senha";
import type { Lancamento } from "../domain/tipos";

const PK_CONFIG = "CONFIG";
const SK_CONFIG = "main";
const PK_LEDGER = "LEDGER";

export interface Credencial {
  salt: string;
  hash: string;
}

/** Chave de ordenação do lançamento: data e id, que ordenam como o domínio. */
function chaveDoLancamento(l: Pick<Lancamento, "data" | "id">): string {
  return `${l.data}#${l.id}`;
}

function paraLancamento(item: Record<string, unknown>): Lancamento {
  const { pk: _pk, sk: _sk, ...resto } = item;
  return resto as unknown as Lancamento;
}

export interface Repositorio {
  /** Lê `{ salt, hash }` da senha; `null` enquanto o sistema não foi inicializado. */
  lerCredencial(): Promise<Credencial | null>;
  /**
   * Devolve o segredo do JWT, criando-o com `gerar()` na primeira vez. A
   * criação é atômica: chamadas simultâneas recebem o mesmo segredo.
   */
  garantirJwtSecret(gerar: () => string): Promise<string>;
  /** Todos os lançamentos, ordenados por data e, em empate, por id. */
  listarLancamentos(): Promise<Lancamento[]>;
  /** Grava um lançamento novo; falha se já existir um com a mesma chave. */
  gravarLancamento(lancamento: Lancamento): Promise<void>;
  /** Remove definitivamente; `false` se o lançamento já não existia. */
  removerLancamento(lancamento: Pick<Lancamento, "data" | "id">): Promise<boolean>;
  /**
   * Cria a configuração inicial (senha e hash) e o primeiro lançamento de
   * proporção, de forma atômica e idempotente. Devolve `false` se o sistema já
   * estava inicializado (nada é alterado).
   */
  inicializar(opcoes: InicializacaoOpcoes): Promise<boolean>;
}

export interface InicializacaoOpcoes {
  senha: string;
  salt: string;
  /** Primeiro lançamento `proporcao` (50/50), já com id, data e autor. */
  proporcaoInicial: Lancamento;
  agora: string;
}

export function criarRepositorio(
  doc: DynamoDBDocumentClient,
  tabela: string,
): Repositorio {
  return {
    async lerCredencial() {
      const r = await doc.send(
        new GetCommand({ TableName: tabela, Key: { pk: PK_CONFIG, sk: SK_CONFIG } }),
      );
      const salt = r.Item?.salt;
      const hash = r.Item?.hash;
      if (typeof salt !== "string" || typeof hash !== "string") return null;
      return { salt, hash };
    },

    async garantirJwtSecret(gerar) {
      const r = await doc.send(
        new UpdateCommand({
          TableName: tabela,
          Key: { pk: PK_CONFIG, sk: SK_CONFIG },
          UpdateExpression: "SET jwtSecret = if_not_exists(jwtSecret, :novo)",
          ExpressionAttributeValues: { ":novo": gerar() },
          ReturnValues: "ALL_NEW",
        }),
      );
      return r.Attributes?.jwtSecret as string;
    },

    async listarLancamentos() {
      const itens: Lancamento[] = [];
      let chave: Record<string, unknown> | undefined;
      do {
        const r = await doc.send(
          new QueryCommand({
            TableName: tabela,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": PK_LEDGER },
            ExclusiveStartKey: chave,
          }),
        );
        for (const item of r.Items ?? []) itens.push(paraLancamento(item));
        chave = r.LastEvaluatedKey;
      } while (chave);
      return itens;
    },

    async gravarLancamento(lancamento) {
      await doc.send(
        new PutCommand({
          TableName: tabela,
          Item: { pk: PK_LEDGER, sk: chaveDoLancamento(lancamento), ...lancamento },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    },

    async removerLancamento(lancamento) {
      try {
        await doc.send(
          new DeleteCommand({
            TableName: tabela,
            Key: { pk: PK_LEDGER, sk: chaveDoLancamento(lancamento) },
            ConditionExpression: "attribute_exists(pk)",
          }),
        );
        return true;
      } catch (e) {
        if (e instanceof ConditionalCheckFailedException) return false;
        throw e;
      }
    },

    async inicializar({ senha, salt, proporcaoInicial, agora }) {
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Update: {
                  TableName: tabela,
                  Key: { pk: PK_CONFIG, sk: SK_CONFIG },
                  UpdateExpression: "SET salt = :salt, #hash = :hash, inicializadoEm = :agora",
                  ConditionExpression: "attribute_not_exists(salt)",
                  ExpressionAttributeNames: { "#hash": "hash" },
                  ExpressionAttributeValues: {
                    ":salt": salt,
                    ":hash": calcularHashSenha(senha, salt),
                    ":agora": agora,
                  },
                },
              },
              {
                Put: {
                  TableName: tabela,
                  Item: {
                    pk: PK_LEDGER,
                    sk: chaveDoLancamento(proporcaoInicial),
                    ...proporcaoInicial,
                  },
                  ConditionExpression: "attribute_not_exists(pk)",
                },
              },
            ],
          }),
        );
        return true;
      } catch (e) {
        if (e instanceof TransactionCanceledException) return false;
        throw e;
      }
    },
  };
}
