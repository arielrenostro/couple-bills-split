## Context

A tela de Saldo (`frontend/src/telas/saldo.ts`) tem hoje o botão "+ Adicionar conta", a fileira `.atalhos` (hoje com "Paguei" e "Histórico", em 2 colunas, desde `menu-configuracoes-ciclo-tabela`, já arquivada) e o painel do ciclo. As telas internas são funções que devolvem um nó DOM, registradas em `main.ts`, e carregam a proporção por `obterSaldo()` (`Saldo.proporcao`, inteiros que somam 100). Valores digitados passam por `lerValor` e são exibidos por `formatarMoeda` (`formato.ts`). A divisão de despesas existe só no backend (`domain/divisao.ts`); o frontend não importa código do backend. Motivação e escopo em `proposal.md`; requisito em `specs/pwa-ui`.

## Goals / Non-Goals

**Goals:**
- Dado um total, mostrar a parte de cada um pela proporção vigente, na hora, com a soma exata.
- Parecer parte do mesmo app e funcionar bem de 320px a 480px, em claro e escuro, com teclado e leitor de tela.

**Non-Goals:**
- Guardar depósitos, histórico de cálculos ou qualquer estado; nenhum endpoint novo.
- Cálculo inverso (um já depositou X, quanto falta ao outro) e proporção diferente da vigente.
- Botão de copiar ou compartilhar o resultado.

## Decisions

### D1. Acesso: terceiro atalho "Depósito" na tela de Saldo, rota `/deposito`

O pedido é "um botão". O uso é esporádico, mas é uma tarefa, não uma configuração, e o casal quer evitar esforço: um toque a partir da home. A fileira `.atalhos` volta a ter 3 colunas (como antes da mudança do menu), com `Paguei`, `Histórico` e `Depósito`. A 320px cada coluna tem cerca de 90px, e o maior rótulo ("Histórico", 9 letras a 0,95rem) já cabia nessa largura.

Alternativas: (a) item no menu de configurações, rejeitado porque o menu é para ajustes e sair, e porque custaria dois toques; (b) botão dentro da tela de Proporção, rejeitado por ser difícil de achar e acoplar duas tarefas sem relação; (c) dentro da tela de Compra, rejeitado porque depósito não é uma conta e confundiria o formulário.

### D2. Cálculo no frontend, em função pura

`frontend/src/deposito.ts` exporta `dividirDeposito(total, proporcao)` com a regra do spec: `ariel = floor((total * proporcao.ariel + 50) / 100)` e `isabella = total - ariel`. É a mesma ideia de `dividirDespesa` (uma parte arredondada, a outra é o restante, soma exata), mas sem "quem pagou", porque num depósito os dois entram; por isso o restante precisa de dono fixo. O Ariel recebe o arredondamento e a Isabella o restante para que os dois aparelhos mostrem sempre o mesmo resultado, independentemente de quem está logado. Sem endpoint: a proporção já vem de `GET /api/saldo` e o cálculo não precisa de histórico nem de relógio. A função fica fora da tela para ser testada sem DOM (padrão de `formato.ts`).

Alternativas: endpoint novo no backend, rejeitado por acrescentar uma chamada e uma superfície de API para uma conta de uma linha; compartilhar `divisao.ts` com o backend, rejeitado porque o frontend não importa o backend e o workspace não tem pacote comum.

### D3. Cálculo ao vivo, sem botão "Calcular"

O resultado é recalculado no evento `input` do campo de valor, usando `lerValor` (aceita "1000", "1.000,50", "R$ 12,5"). Não há botão: calcular é a única coisa que a tela faz, então um botão só acrescentaria um toque. A região do resultado é `aria-live="polite"` para leitores de tela. O campo recebe foco ao abrir a tela. Valor vazio mostra "—" nas partes, sem erro (a pessoa ainda não digitou); texto que não é valor ou zero mostra "Informe um valor maior que zero." (`.erro-campo`, `role="alert"` apenas quando há texto digitado).

A proporção não é buscada de novo ao abrir a calculadora. A tela de Saldo, que sempre antecede o Depósito, já pede `GET /api/saldo` a cada vez que aparece; ela passa a guardar `saldo.proporcao` em `frontend/src/proporcaoVigente.ts` (variável em memória, sem `localStorage`: some ao fechar o app e é descartada em `encerrarSessao`) e a calculadora a lê de lá, abrindo na hora, sem tela de carregando. Só quando não há proporção guardada (abertura direta, por exemplo recarregar em `#/deposito`) a tela cai no caminho antigo: `obterSaldo()` com `carregando()` e `caixaDeErro(..., tentarDeNovo)`, e guarda o que recebeu.

Alternativas: (a) manter a consulta a cada abertura, rejeitado por ser uma ida ao servidor sem necessidade; (b) guardar em `localStorage`, rejeitado porque a proporção pode mudar no outro celular e um valor persistido por dias daria um cálculo errado sem aviso, e porque o spec proíbe a calculadora de deixar dados no aparelho; (c) passar a proporção pelo roteador a cada tela, rejeitado por mudar a assinatura de todas as telas para um uso só.

### D4. Direção visual: continuar o app, gastar o cuidado nos dois valores

Plano feito com a skill frontend-design e revisado contra os padrões genéricos.

- **Cor**: só as existentes (`--superficie`, `--texto`, `--texto-suave`, `--borda`, `--acento-suave`, `--acento`). Nenhuma cor nova.
- **Tipo**: `system-ui` já em uso. Os dois valores calculados em cerca de 1,6rem, peso 750, `tabular-nums`, alinhados à direita; nome da pessoa no tamanho do corpo; percentual em `--texto-suave` ao lado do nome, em caixa normal.
- **Layout**: uma coluna: título (com o botão de voltar do `topo()`), uma linha de ajuda, o campo de valor, e um único painel com duas linhas (Ariel, Isabella) separadas por uma linha fina de `--borda`. Texto à esquerda, números à direita.
- **Princípio**: o resultado é a única coisa em destaque; o campo é o mesmo `input` do app; nada decorativo.

```
┌──────────────────────────────┐
│ ‹  Depósito                  │
│ Quanto cada um coloca na     │
│ conta conjunta.              │
│                              │
│ Valor total (R$)             │
│ ┌──────────────────────────┐ │
│ │ 1.000,00                 │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ Ariel 60%      R$ 600,00 │ │
│ │ ──────────────────────── │ │
│ │ Isabella 40%   R$ 400,00 │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Revisão contra o padrão: descartei (a) uma barra dividida em dois segmentos pela proporção, porque repetiria o percentual que já está escrito, ou seja, decoração; (b) um cartão grande por pessoa com número gigante e gradiente, que é o tratamento genérico de "número de destaque" e pesaria mais que a tarefa; (c) um rótulo em caixa alta acima do resultado ("PARTES"), porque os nomes já dizem o que é; (d) animação ao trocar os valores, porque em digitação seria ruído; (e) o título longo "Depósito na conta conjunta", que quebraria em 2 linhas a 320px ao lado do botão de voltar, então o título é só "Depósito" e a explicação vai para a linha de ajuda.

### D5. Texto da tela

Título "Depósito"; ajuda "Quanto cada um coloca na conta conjunta, na proporção atual."; rótulo do campo "Valor total (R$)", com placeholder "0,00" e `inputMode: "decimal"`, como na Compra; linhas "Ariel", "Isabella" com o percentual; nada de "Calcular". O botão na home diz "Depósito".

### D6. Casco do PWA

`public/sw.js` guarda o casco do app: `CACHE` precisa ter um nome diferente do publicado para as instalações existentes baixarem a tela nova (regra do `CLAUDE.md`). No HEAD ele está em `contas-v3` (subido pela mudança do menu). Se essa versão já foi publicada, sobe para a próxima; a tarefa confere o histórico do arquivo antes.

## Risks / Trade-offs

- [Os 3 atalhos ficam apertados em 320px] → Verificação manual a 320px e 480px nos dois temas; se o rótulo não couber, reduz o padding lateral dos atalhos antes de reduzir a fonte.
- [Valores grandes estourarem a linha do resultado em 320px] → `nowrap` nos valores, o nome encolhe primeiro; verificar com R$ 123.456,78.
- [O centavo quebrado sempre ficar com o Ariel] → É uma diferença de no máximo 1 centavo e a regra fixa vale mais que a simetria (os dois celulares mostram o mesmo número); documentado no spec.
- [Esta mudança contradiz o cenário "Sem atalho de Proporção" do spec principal, que listava só dois atalhos] → O delta tem um MODIFIED de "Tela de Saldo como inicial" que inclui "Depósito".
- [Proporção desatualizada: o valor guardado é o da última vez que a tela de Saldo carregou] → A tela de Saldo recarrega a cada vez que é exibida, e é de lá que se chega ao Depósito; só muda algo se a proporção for alterada no outro celular enquanto este fica parado na calculadora. Aceito, e quem alterar a proporção neste aparelho passa pela tela de Saldo antes.

## Migration Plan

Só frontend: `npm run deploy` (build, sync no S3, invalidação). Reversão: redeploy do commit anterior. Sem dados nem API envolvidos.
