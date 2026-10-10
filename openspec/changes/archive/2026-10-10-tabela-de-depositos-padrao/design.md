## Context

A tela de Depósito (`frontend/src/telas/deposito.ts`, requisito "Calculadora de depósito" já nos specs) monta o campo de valor e um painel com duas linhas (Ariel e Isabella) dentro de `calculadora(proporcao)`; a proporção vem da tela de Saldo (`proporcaoVigente.ts`) ou de `obterSaldo()` na abertura direta. A divisão está em `dividirDeposito(total, proporcao)` (`frontend/src/deposito.ts`), em centavos. `formato.ts` só tem formatadores com símbolo (`formatarMoeda`) ou para campo (`formatarValorCampo`). A tabela do ciclo na home (`.tabela-ciclo`) é a referência visual: números à direita, `tabular-nums`, linhas finas de `--borda`, sem zebra. Motivação e escopo em `proposal.md`; requisito em `specs/pwa-ui`.

## Goals / Non-Goals

**Goals:**
- Dez linhas de R$ 1.000 a R$ 10.000 com as partes pela proporção vigente, visíveis ao abrir, sem consulta extra.
- Caber em 320px, em claro e escuro, sem rolagem horizontal; legível e com semântica de tabela.

**Non-Goals:**
- Lista editável, outros degraus, tocar na linha para preencher o campo, destaque da linha mais próxima do valor digitado.
- Mudar a calculadora, a regra de arredondamento ou o que ela mostra.

## Decisions

### D1. Linhas calculadas por uma função pura, com a mesma divisão da calculadora

`frontend/src/deposito.ts` ganha `VALORES_PADRAO` (de 1.000 a 10.000 reais, em centavos) e `tabelaDePadroes(proporcao)`, que devolve `{ total, ariel, isabella }` por linha usando `dividirDeposito`. Assim a regra de arredondamento é uma só e a função é testável sem DOM. Com totais múltiplos de R$ 1.000 e percentuais inteiros, as partes saem sempre sem centavos (`total * pct / 100` é múltiplo de 10 reais), mas são exibidas com ",00"; o reuso garante a soma exata se a lista mudar um dia.

Alternativa rejeitada: calcular `total * pct / 100` na tela, que duplicaria a regra.

### D2. Valores com "R$" e duas casas, formatados como no resultado

As células usam o `formatarMoeda` que já existe (o mesmo do resultado da calculadora), então "R$ 10.000,00" tem a mesma aparência em toda a tela e não há formatador novo. O custo é a largura: em 320px o painel tem cerca de 254px úteis e três colunas de 12 caracteres a 1rem passam de 300px. Duas medidas: (a) o painel da tabela reduz o padding lateral de 16px para 12px; (b) a fonte da tabela é `clamp(0.78rem, 3.6vw, 1rem)`, que a 320px dá cerca de 12,5px e chega a 1rem a partir de cerca de 445px. As células seguem em `nowrap` e `tabular-nums`.

Alternativas: tirar o "R$" e os centavos das células (a primeira versão desta change), rejeitada porque o app inteiro mostra moeda com símbolo e centavos e a diferença foi estranhada; quebrar o valor total em duas linhas ou rolar a tabela na horizontal, rejeitado por prejudicar a leitura e o spec proibir rolagem horizontal.

### D3. Posição, semântica e rótulo

A tabela fica depois do painel do resultado, num painel próprio (`.painel`, como o resto do app), com `<table>`, `<caption>` ("Valores prontos") e `<th scope="col">` "Valor total", "Ariel" e "Isabella", e `<th scope="row">` no valor total de cada linha. O `<caption>` serve de nome acessível, então é o único rótulo e não há título extra acima dela. Como `calculadora(proporcao)` já recebe a proporção, a tabela é montada uma vez ali e não é tocada pelo evento `input` do campo.

### D4. Direção visual: continuar o app, a tabela fica quieta

Plano feito com a skill frontend-design e revisado contra os padrões genéricos.

- **Cor**: só as existentes (`--superficie`, `--texto`, `--texto-suave`, `--borda`). Nenhuma cor nova.
- **Tipo**: `system-ui` já em uso, `tabular-nums`, 1rem em telas largas e menor em telas estreitas (D2); cabeçalhos e a coluna do valor total em `--texto-suave` e caixa normal; as partes de Ariel e Isabella em peso 600, porque são a resposta, no padrão da tabela do ciclo.
- **Layout**: tabela de largura total do painel, três colunas, tudo alinhado à direita, linhas finas de `--borda`, sem zebra, sem destaque de linha. O resultado da calculadora continua sendo o elemento de destaque da tela; a tabela é consulta.

```
┌──────────────────────────────┐
│ Valor total (R$)             │
│ [ 1.000,00               ]   │
│ ┌──────────────────────────┐ │
│ │ Ariel 60%     R$ 600,00  │ │  resultado (inalterado)
│ │ Isabella 40%  R$ 400,00  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Valores prontos          │ │  caption
│ │ Valor total Ariel Isabel.│ │
│ │ ──────────────────────── │ │
│ │ R$ 1.000,00 R$ 600,00 .. │ │
│ │ R$ 2.000,00 R$ 1.200,00  │ │
│ │          ...             │ │
│ │ R$ 10.000,00 R$ 6.000,00 │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Revisão contra o padrão: descartei (a) zebra e cabeçalho de tabela com fundo colorido, que são o kit padrão de tabelas e pesariam mais que o resultado; (b) cabeçalhos em caixa alta com espaçamento; (c) um título "VALORES PRONTOS" separado, já que o `<caption>` cumpre o papel; (d) cartões por linha, que multiplicariam bordas e alturas e desfariam a leitura em colunas; (e) animação de entrada.

### D5. Casco do PWA

Mudança de casco: `CACHE` em `public/sw.js` sobe para a próxima versão, e o nome fixo em `frontend/e2e/pwa.mjs` precisa acompanhar (já quebrou uma vez por isso).

## Risks / Trade-offs

- [A tabela comprida empurra o resultado para o alto da tela e o rodapé para baixo] → O resultado e o campo ficam antes da tabela; a rolagem vertical é aceita (dez linhas, cerca de 400px).
- [Fonte pequena em telas estreitas] → O `clamp` do D2 só reduz abaixo de cerca de 445px; a 320px a fonte fica em cerca de 12,5px, com contraste normal, num uso de consulta. Verificação manual a 320px nos dois temas.
- [Percentual quebrado no futuro gera valor com centavos] → `tabelaDePadroes` reusa `dividirDeposito`, então a soma continua exata, e as duas casas já estão sempre à mostra.
- [R$ 10.000,00 em 320px é a célula mais larga] → Verificar essa linha a 320px e a 480px nos dois temas, sem rolagem horizontal.

## Migration Plan

Só frontend: `npm run deploy` (build, sync no S3, invalidação). Reversão: redeploy do commit anterior. Sem dados nem API.
