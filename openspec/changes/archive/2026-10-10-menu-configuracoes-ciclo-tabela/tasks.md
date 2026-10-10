## 1. Utilitários

- [x] 1.1 Criar em `frontend/src/formato.ts` um helper de porcentagem (`{ ariel: 60, isabella: 40 }` → `"60%"` e `"40%"`) e cobri-lo em `frontend/test/formato.test.ts`; verificar com `npm test -w frontend`
- [x] 1.2 Criar em `frontend/src/ui/` o helper do ícone de engrenagem em SVG via `createElementNS` (`currentColor`, `aria-hidden="true"`, sem `innerHTML`); verificar com `npm run typecheck -w frontend`

## 2. Menu de configurações

- [x] 2.1 Criar o componente de menu em `frontend/src/ui/` (botão com `aria-label="Configurações"`, `aria-haspopup="menu"` e `aria-expanded`; `<dialog>` com `role="menu"` e itens `role="menuitem"`, fechando por Esc, toque no backdrop e escolha de item, no padrão de `confirmar()`); verificar com `npm run typecheck -w frontend`
- [x] 2.2 Em `frontend/src/telas/saldo.ts`, trocar o botão de texto "Sair" do cabeçalho pelo menu com "Proporção" (navega para `/proporcao`) e "Sair" (chama `aoSair`, sem confirmação); verificar no navegador que o cabeçalho tem a engrenagem à direita e nenhum outro "Sair" na tela
- [x] 2.3 Estilos do menu em `frontend/src/estilos.css`: botão 48x48 alinhado à direita (mesma margem negativa do `.voltar`), `<dialog>` ancorado sob o botão com backdrop transparente, itens com alvo de toque de pelo menos 48px, claro e escuro; verificar visualmente nos dois temas

## 3. Painel "Ciclo atual"

- [x] 3.1 Remover o atalho "Proporção" de `frontend/src/telas/saldo.ts` e passar `.atalhos` para 2 colunas em `estilos.css`; verificar que a home mostra só "Paguei" e "Histórico" lado a lado
- [x] 3.2 Reescrever o painel "Ciclo atual": remover o helper `linha()` e o `<dl>`, mostrar "Total das contas" com o valor em destaque e, abaixo, a `<table>` (colunas Ariel/Isabella com `th scope="col"`, linhas Proporção/Pagou/Parte com `th scope="row"`), usando `s.proporcao`, `cicloAberto.pago` e `cicloAberto.parte`; verificar com um ciclo de R$ 120,00 pago pelo Ariel a 60/40 (Proporção 60% e 40%, Pagou R$ 120,00 e R$ 0,00, Parte R$ 72,00 e R$ 48,00)
- [x] 3.3 Estilos do total e da tabela em `estilos.css` (`tabular-nums`, números à direita, `nowrap`, linha "Proporção" em `--texto-suave`, linhas finas de `--borda`, sem zebra); manter a regra `.linha` por causa do Histórico; verificar a 320px e a 480px, nos temas claro e escuro, com valor de 5 dígitos (R$ 12.345,67) sem rolagem horizontal e com o ciclo vazio (tudo R$ 0,00)

## 4. Testes e entrega

- [x] 4.1 Atualizar `frontend/e2e/roteiro.mjs`: abrir o menu (botão "Configurações") antes de clicar em "Proporção" (duas ocorrências) e antes de clicar em "Sair"; acrescentar uma checagem do total e das células da tabela do ciclo; rodar contra `vite preview` e a API local em **tabela nova**, nunca contra o site publicado
- [x] 4.2 Conferir que `frontend/e2e/pwa.mjs` continua passando (somente leitura)
- [x] 4.3 Subir `CACHE` de `contas-v2` para `contas-v3` em `frontend/public/sw.js` (e a chave esperada em `frontend/e2e/pwa.mjs`); verificar o diff e `pwa.mjs`
- [x] 4.4 Rodar `npm run typecheck -w frontend`, `npm test` e `npm run build`; todos devem passar
- [x] 4.5 Rodar `openspec validate menu-configuracoes-ciclo-tabela --strict` e verificar que passa
