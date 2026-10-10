/** Subconjunto do evento da Lambda Function URL (payload v2) que a API usa. */
export interface EventoHttp {
  rawPath: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext: { http: { method: string } };
}

export interface RespostaHttp {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function json(statusCode: number, corpo: unknown): RespostaHttp {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(corpo),
  };
}

export function erroHttp(statusCode: number, codigo: string, mensagem: string): RespostaHttp {
  return json(statusCode, { erros: [{ codigo, mensagem }] });
}

/** Lê o corpo como JSON; `undefined` quando é inválido ou não é um objeto. */
export function lerCorpoJson(evento: EventoHttp): Record<string, unknown> | undefined {
  if (!evento.body) return undefined;
  try {
    const bruto = evento.isBase64Encoded
      ? Buffer.from(evento.body, "base64").toString("utf8")
      : evento.body;
    const valor: unknown = JSON.parse(bruto);
    return valor !== null && typeof valor === "object" && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
