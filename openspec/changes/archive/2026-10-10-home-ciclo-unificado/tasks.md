## 1. Proporção efetiva

- [x] 1.1 Criar a função pura `proporcaoEfetiva(parte, total)` em `frontend/src/` (décimos inteiros: Ariel = `Math.round(parte.ariel * 1000 / total)`, Isabella = `1000 - Ariel`; `null` com total 0) e um formatador de porcentagem com no máximo uma casa decimal em `formato.ts` (`60%`, `58,3%`, vírgula); cobrir em `frontend/test/` os casos 72/48 de 120 (60 e 40), 70/50 de 120 (58,3 e 41,7), total 0 (`null`), 100%/0%, 1 centavo, e que a soma é sempre 100,0 para partes variadas; verificar com `npm test -w frontend`

## 2. Home

- [x] 2.1 Reescrever `conteudo` em `frontend/src/telas/saldo.ts`: remover o card "Saldo"; painel "Ciclo atual" com `.metricas` contendo "Total das contas" (`.total-valor`) e `.divida` ("{Nome} deve" + valor, `data-devedor`; "Quites" + "R$ 0,00" com tom suave quando `saldo` é `null`); tabela com a linha "Efetiva" entre "Proporção" e "Pagou" (tom `suave`, "—" quando `null`); verificar com `npm run typecheck -w frontend`
- [x] 2.2 Botões em `saldo.ts`: "+ Adicionar conta" (`grande destaque`), "Adicionar acerto" (`grande secundario`, `disabled: !s.saldo`, vai para `/acerto`) logo abaixo na mesma largura, e `.atalhos` com "Histórico" e "Depósito"; verificar no navegador que os dois primeiros ocupam a largura toda e que o acerto fica desabilitado quando quitado
- [x] 2.3 Trocar o título de `frontend/src/telas/acerto.ts` de "Paguei" para "Adicionar acerto"; verificar abrindo o acerto pela home
- [x] 2.4 Estilos em `frontend/src/estilos.css`: remover `.saldo-principal`/`.frase-saldo`, criar `.metricas` (flex com `flex-wrap`, sem `clamp()`), `.divida` (valor em `--acento`, `tabular-nums`, `nowrap`) e a variante quitada suave, reduzir valores para ~1.5rem e o padding do painel para 14px, passar `.atalhos` para 2 colunas; só variáveis existentes; verificar a 320px e a 480px, em claro e escuro, com R$ 123.456,78 sem rolagem horizontal e com a dívida descendo para baixo do total quando não couber

## 3. Testes e entrega

- [x] 3.1 Atualizar `frontend/e2e/roteiro.mjs`: trocar as leituras de `.frase-saldo` por um helper que confere rótulo e valor de `.divida` (por exemplo "Isabella deve" e "R$ 48,00"; "Quites" e "R$ 0,00"), as tabelas esperadas passam a incluir a linha "Efetiva", os cliques em "Paguei" viram "Adicionar acerto" e a lista de atalhos esperada vira "Histórico" e "Depósito"; acrescentar um passo com conta customizada que confira "Efetiva" diferente de "Proporção"; rodar contra `vite preview` e a API local em **tabela nova**, nunca contra o site publicado
- [x] 3.2 Atualizar `frontend/e2e/pwa.mjs` (espera `.frase-saldo`, nome fixo do cache) e conferir que continua passando; ele é somente leitura
- [x] 3.3 Subir `CACHE` em `frontend/public/sw.js` para `contas-v8` e o nome fixo em `frontend/e2e/pwa.mjs`; verificar o diff
- [x] 3.4 Rodar `npm run typecheck -w frontend`, `npm test` e `npm run build`; todos devem passar
- [x] 3.5 Rodar `openspec validate home-ciclo-unificado --strict` e conferir que não sobrou nenhuma menção a "Paguei" no delta, nem `.frase-saldo` em `frontend/e2e/`
