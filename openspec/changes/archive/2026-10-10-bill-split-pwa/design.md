## Context

Projeto novo, sem código. Dois usuários (Ariel e Isabella), poucos lançamentos por mês, uso quase exclusivo no celular. O motivo e o escopo estão em `proposal.md`; os requisitos de comportamento estão em `specs/`. Restrição central: custo zero (ou centavos).

## Goals / Non-Goals

**Goals:**
- Um único domínio de cálculo (ledger) determinístico e fácil de testar, separado da camada HTTP e da interface.
- Infraestrutura mínima: tudo servido pela mesma origem, sem API Gateway e sem CORS.
- Saldo sempre derivado do histórico, para nunca haver divergência entre "o que foi lançado" e "o que está somado".

**Non-Goals:**
- Compilados, caches de saldo ou tabelas de resumo (poucos registros; recalcular tudo a cada leitura).
- Edição de lançamentos (só remoção), notificações push e fila offline.
- Gestão de usuários, recuperação de senha ou múltiplas casas.

## Decisions

### D1. Topologia: CloudFront na frente de S3 e da Lambda Function URL

```
 Celular (PWA)
      |
      v
  CloudFront
   |-- /*       -> S3 (HTML, JS, manifest, service worker)
   '-- /api/*   -> Lambda Function URL (sem cache)
                      |
                      v
                  DynamoDB (1 tabela)
```

- Mesma origem para app e API elimina CORS.
- Function URL no lugar de API Gateway: gratuita e suficiente para duas pessoas. O API Gateway só se justificaria por throttling ou autorizadores, que não são necessários aqui.
- A Function URL é **pública** (`authType NONE`) e o JWT é a barreira: todas as rotas, exceto o login, exigem token. OAC foi avaliado e descartado (decisão do usuário na implementação): com OAC o navegador teria de calcular o SHA-256 do corpo em todo `POST`/`PUT` e enviá-lo em `x-amz-content-sha256`, e o CloudFront sobrescreve o header `Authorization` por padrão, o que forçaria o JWT para outro header. Como não há WAF nem cache na frente da API, a chamada direta à Lambda não expõe nada além do que o CloudFront já expõe.
- Alternativa descartada: API Gateway HTTP API (grátis só por 12 meses, depois ~US$1/milhão — centavos, mas é uma peça a mais sem ganho).

### D2. Uma tabela DynamoDB, dois tipos de item

| Item | `pk` | `sk` | Conteúdo |
|---|---|---|---|
| Configuração | `CONFIG` | `main` | `salt`, `hash`, `jwtSecret` |
| Lançamento | `LEDGER` | `AAAA-MM-DD#<id crescente>` | `tipo`, campos do tipo, `criadoPor`, `criadoEm` |

- O `sk` ordena por data e, no empate, pela ordem de criação (id crescente, p.ex. ULID). Uma `Query` em `pk = LEDGER` devolve o histórico já ordenado. Com poucos registros, ler tudo a cada requisição é aceitável.
- O id do lançamento é o próprio `sk`, usado para remover.
- Escritas usam condição (`attribute_not_exists`) para evitar sobrescrita; remoções são `DeleteItem` condicionadas à existência.
- Alternativa descartada: um item por mês/ciclo agregando lançamentos — complica remoção e datas retroativas sem necessidade.

### D3. Autenticação

- Senha única: `hash = sha256(senha + salt)`, ambos em `CONFIG/main`, comparado com `timingSafeEqual`. É um hash simples por escolha do usuário; fica registrado que não é um KDF lento (ver Riscos).
- JWT HS256, `sub` = `ariel` ou `isabella`, validade de 3650 dias. O segredo é gerado aleatoriamente na primeira execução com escrita condicional (`attribute_not_exists`), para duas invocações simultâneas não gerarem segredos diferentes. Rotacionar o segredo é a forma de invalidar todas as sessões.
- A senha inicial `batman` e o primeiro lançamento `proporcao` (50/50) são criados na inicialização, feita por script de deploy (ver D7). O `salt` inicial é aleatório; trocar a senha manualmente é recalcular `sha256(nova + salt)` e gravar no item.
- No cliente, o token fica em `localStorage` e vai no header `Authorization: Bearer`. Cookies foram descartados: navegadores limitam a validade de cookies (Chrome, ~400 dias), então não cobririam os 3650 dias.
- Alternativa descartada: Cognito (excessivo para dois usuários) e par de chaves RS256 (sem ganho com um único serviço assinando e verificando).

### D4. Cálculo do saldo: varredura única sobre o histórico ordenado

O domínio é uma função pura: recebe a lista ordenada de lançamentos e devolve, para cada um, o ciclo, as partes de cada pessoa e o saldo acumulado, além do saldo atual. Passos:

1. Percorre os lançamentos em ordem, mantendo o ciclo corrente, a proporção vigente (último `proporcao` visto) e o saldo do ciclo.
2. `despesa`: soma ao saldo a parte de quem não pagou (arredondada); a parte de quem pagou é o restante. Despesas "padrão" usam a proporção vigente; customizadas usam a própria.
3. `acerto`: reduz o saldo. Se o saldo do ciclo, calculado com a proporção vigente naquele ponto, é exatamente zero, o ciclo fecha.
4. `proporcao`: atualiza a proporção vigente. Em ciclo aberto, o saldo atual passa a refletir a proporção nova para **todas** as despesas "padrão" do ciclo (inclusive as anteriores); por isso o saldo atual é recalculado do início do ciclo com a proporção mais recente.

Consequências a documentar na implementação:
- O **saldo acumulado** exibido em cada card é o saldo do ciclo naquele ponto, com a proporção vigente naquele ponto. Uma mudança de proporção posterior não reescreve os acumulados dos cards anteriores; ela aparece no card da própria `proporcao` (saldo antes e depois) e no saldo atual.
- Como o fechamento é decidido na varredura, um acerto com data retroativa que zere o saldo no meio do ciclo aberto fecha o ciclo naquele ponto, e os lançamentos posteriores a ele passam a ser do ciclo seguinte.
- Valores em centavos inteiros e proporção como percentual inteiro. Parte de quem não pagou arredondada; a de quem pagou é `total - parte do outro`, garantindo soma exata.

A mesma função é usada para a leitura (saldo e histórico) e para validar escritas (data mínima, remoção permitida, preview de proporção), de modo que regras e telas nunca divergem.

### D5. Validações de escrita feitas no backend

- Data: `hoje >= data >= data do acerto que fechou o último ciclo`.
- Remoção: só lançamentos do ciclo aberto, e nunca o acerto que fechou um ciclo.
- Preview de proporção: endpoint (ou parâmetro de simulação) que roda a função de D4 com a proporção hipotética, sem gravar, e devolve saldo antes e depois.
- O frontend repete as validações só para dar feedback rápido; a fonte da verdade é a Lambda.
- Condição de corrida entre os dois usuários (por exemplo, dois acertos simultâneos) é tratada como improvável: a escrita é condicional por item, e a validação de ciclo usa a leitura imediatamente anterior.

### D6. Frontend

- PWA com `manifest`, ícone, service worker que cacheia o shell (HTML/JS/CSS) e deixa `/api/*` sempre na rede.
- Cinco telas: Login, Saldo (inicial), Compra, Histórico (cards), Proporção (com preview). Acerto ("Paguei") abre da tela de Saldo.
- Mobile-first: alvos de toque grandes, `inputmode="decimal"` nos valores, formatação em BRL, `pt-BR`.
- Confirmações por modal nativo do app para remover e para "Paguei"; o preview da proporção é o passo de confirmação dela. A confirmação do "Paguei" deve avisar quando o acerto fecha o ciclo.

### D7. Stack de implementação (confirmada pelo usuário na tarefa 1.2)

- **Backend**: TypeScript em Node 22 na Lambda. Hash e `timingSafeEqual` vêm de `node:crypto`; o JWT HS256 é assinado com `node:crypto`, sem biblioteca extra.
- **Frontend**: Vite + TypeScript, sem framework.
- **IaC**: AWS CDK em TypeScript.
- **Inicialização**: script de deploy idempotente (senha `batman` com salt aleatório e primeiro lançamento `proporcao` 50/50); a Lambda não carrega lógica de seed.
- Estrutura: monorepo com npm workspaces (`backend/`, `frontend/`, `infra/`). O domínio do ledger fica em `backend/src/domain`, sem dependências de AWS; o preview de proporção vem da API, então o frontend não compartilha código com o domínio.

### D8. CloudFront no plano gratuito de preço fixo (decisão do usuário na implementação)

- A distribuição é assinada no plano **Free** do CloudFront (US$ 0, 1 milhão de requisições e 100 GB por mês, sem cobrança de excedente) pela API `pricing-plan-manager`, no passo `scripts/plano-gratuito.sh` do deploy (idempotente).
- O plano exige uma **Web ACL do WAF** (escopo `CLOUDFRONT`, só em us-east-1) associada à distribuição. Ela é definida no CDK, com os mesmos três grupos de regras gerenciadas que o console cria por padrão (reputação de IP, regras comuns, entradas maliciosas conhecidas), dentro do limite de 5 regras do Free. Fica no CDK para o `cdk deploy` não remover a associação.
- A distribuição precisa de `PriceClass_All`: com `PriceClass_100` a API recusou a assinatura ("not eligible"); mudando só isso, foi aceita.
- Só usamos políticas **gerenciadas** (cache, requisição à origem e headers de resposta), que o plano aceita; o Free não inclui políticas customizadas. Se uma rota futura precisar de uma política própria, é preciso um plano superior ou voltar ao pago por uso.
- Alternativa descartada: ficar no pago por uso. O custo real seria praticamente zero pela camada gratuita permanente, mas sem a garantia de "sem excedente".
- Limite de 3 planos Free por conta (já há outra assinatura Free nesta conta, de outro projeto).

## Risks / Trade-offs

- **Senha fraca e URL pública** (`batman`, hash SHA-256 simples, sem limite de tentativas) → o risco foi aceito pelo usuário, que trocará a senha manualmente. Mitigação futura barata: contador de tentativas no DynamoDB e KDF lento (scrypt).
- **Token de 10 anos** → um aparelho perdido mantém acesso por muito tempo. Mitigação: rotacionar o segredo invalida todas as sessões.
- **Segredo do JWT e hash no mesmo item** → quem tiver leitura no DynamoDB consegue forjar tokens. Aceitável para o contexto; o acesso ao DynamoDB fica restrito à role da Lambda.
- **Acerto retroativo irremovível** → um acerto com data passada que zere o saldo fecha o ciclo e não pode ser removido (ciclos fechados nunca reabrem). Mitigação: a confirmação do acerto avisa que ele fecha o ciclo e mostra a data.
- **Fechamento por efeito colateral** → como o ciclo é derivado, qualquer escrita no ciclo aberto (registrar uma despesa ou proporção retroativa, ou remover um lançamento) pode fazer um acerto parcial já existente passar a zerar o saldo; ele então fecha o ciclo naquele ponto, os lançamentos posteriores migram para o ciclo seguinte e o acerto passa a ser irremovível. Nenhum ciclo fechado reabre. A implementação do domínio aceita esse comportamento sem validação extra; se for indesejado, a alternativa é rejeitar escritas que alterem o conjunto de acertos de fechamento.
- **Conta AWS nova** → créditos expiram em até 12 meses (contas criadas após 15/07/2025). Se for o caso, a alternativa gratuita sem prazo é Cloudflare Pages/Workers + D1, mantendo o mesmo domínio e a mesma API.
- **Leitura integral do histórico a cada chamada** → cresce com o tempo, mas com poucas dezenas de lançamentos por mês levará anos para importar. Se virar problema, arquivar ciclos fechados.
