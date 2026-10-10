## Context

A home (`frontend/src/telas/saldo.ts`) hoje tem: um painel verde "Saldo" com a frase `fraseSaldo(...)` em `.frase-saldo`, o botão "+ Adicionar conta", `.atalhos` (grade de 3 colunas com "Paguei", "Histórico" e "Depósito") e o painel "Ciclo atual" com `.total-ciclo` e `.tabela-ciclo`. Os estilos usam os tokens de `estilos.css` (`--acento`, `--acento-suave`, `--superficie`, `--borda`, `--texto-suave`), que não mudam. Motivação e escopo: ver `proposal.md`; comportamento: ver o delta de `pwa-ui`.

`GET /api/saldo` já devolve `saldo` (devedor, credor, valor, ou `null`), `proporcao` e `cicloAberto` com `totalDespesas`, `pago` e `parte`. Nada disso muda.

## Goals / Non-Goals

**Goals:**
- Um painel só para o ciclo, com a dívida como uma das métricas, e botões de ação com larguras coerentes.
- Calcular a proporção efetiva no aparelho, de forma testável, sem float acumulado.

**Non-Goals:**
- Novo campo na API ou cálculo no backend.
- Mudar paleta, tipografia, histórico ou tela de proporção.
- Reaproveitar a frase "X deve R$ Y a Z" na home.

## Decisions

**D1. Proporção efetiva = `parte / total`, calculada no frontend.** Uma função pura (`proporcaoEfetiva(parte, total)` em `frontend/src/`) devolve a porcentagem de cada pessoa ou `null` quando `total` é 0. Trabalha em décimos de ponto percentual inteiros: `arielDecimos = Math.round((parte.ariel * 1000) / total)` e `isabellaDecimos = 1000 - arielDecimos`, então a soma é sempre 100,0%. A formatação mostra `60%` quando o décimo é múltiplo de 10 e `58,3%` (vírgula) caso contrário. Alternativas: `pago / total` (descartada: "Pagou" já mostra quem desembolsou e a pergunta do casal é sobre a divisão real); devolver a efetiva pelo backend (descartada: os dados já chegam e o cálculo é uma divisão). Como a `parte` já considera contas customizadas e a proporção vigente das contas sem customização, "Efetiva" só difere de "Proporção" quando existe conta customizada.

**D2. A dívida é um bloco próprio (`.divida`) com rótulo e valor, não uma frase.** O rótulo é `"{Nome} deve"` (`nomePessoa(devedor)`), o valor é `formatarMoeda(valor)`, e `data-devedor` continua no elemento. Sem dívida, o rótulo é "Quites" e o valor "R$ 0,00" com a classe de tom suave. O credor não aparece: são só duas pessoas. `fraseSaldo` e `fraseSaldoAssinado` ficam em `formato.ts`, usadas pelo histórico e pela tela de proporção. Alternativa descartada: manter a frase em texto pequeno (a frase longa não cabe em uma coluna de ~140px).

**D3. Cabeçalho do painel em flex com quebra, sem `clamp()`.** `.metricas { display: flex; flex-wrap: wrap; gap: 8px 16px }` com cada métrica `flex: 1 1 <base>`. O valor da dívida e o do total diminuem de 2rem para cerca de 1.5rem e o padding do painel diminui de 16px para 14px. Se a linha não couber, a dívida desce sob o total, o que o spec exige ("Tela estreita"). Os dois valores usam `tabular-nums` e `white-space: nowrap` para nunca quebrarem no meio de "R$ 12.345,67". O destaque visual fica só na dívida (cor `--acento`); o total usa a cor de texto normal, e o painel perde a faixa verde do antigo card.

**D4. Botões empilhados na mesma largura.** `.botao` já é `width: 100%`. "Adicionar conta" mantém `grande destaque`; "Adicionar acerto" usa a classe `grande secundario` para ter a mesma altura e largura sem competir com o principal; abaixo, `.atalhos` passa de 3 para 2 colunas com "Histórico" e "Depósito". O `disabled` do acerto continua sendo `!s.saldo`. A tela do acerto muda o título para "Adicionar acerto"; o botão de envio ali já é "Registrar acerto" e fica como está.

**D5. Linha "Efetiva" na tabela existente.** Entra com `linhaDaTabela("Efetiva", ...)` entre "Proporção" e "Pagou", em tom `suave` como "Proporção" (as duas são percentuais; "Pagou" e "Parte" são os valores em reais). Com `null`, as duas células mostram "—".

**D6. Seletores de teste.** `.frase-saldo` sai. O e2e passa a ler `.divida` (rótulo e valor) e `.total-valor`; um helper confere o par "Isabella deve" / "R$ 48,00" e, para quitado, "Quites" / "R$ 0,00". Os clicks em "Paguei" viram "Adicionar acerto".

## Risks / Trade-offs

- [A dívida deixa de ter a frase com credor] → decisão do casal: são só duas pessoas; o histórico e a tela de proporção continuam com a frase completa.
- [Valores muito grandes quebram o layout] → a linha quebra por design (D3); verificar a 320px com R$ 123.456,78 sem rolagem horizontal.
- [Linha "Efetiva" igual à "Proporção" na maior parte do tempo] → aceito, é o que foi pedido; o tom suave evita ruído.
- [Arredondamento a 0,1% pode mostrar 58,3% + 41,7% em vez do exato] → a soma fecha em 100,0% por construção (D1).
- [Cache do PWA mantém a home antiga] → subir `CACHE` em `sw.js` e o nome fixo em `e2e/pwa.mjs`.

## Migration Plan

Só frontend. Publicar com `npm run deploy` depois dos testes; reverter é publicar o commit anterior. Sem dados a migrar.
