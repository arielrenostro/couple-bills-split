## 1. Setup do projeto

- [x] 1.1 Criar a estrutura do monorepo (`backend/`, `frontend/`, `infra/`) em TypeScript e verificar que `npm install` e o build vazio de cada pacote passam
- [x] 1.2 Confirmar com o usuário as escolhas pendentes do design (runtime, frontend, IaC, inicialização) e registrar a decisão final no `design.md`
- [x] 1.3 Configurar o runner de testes do backend e verificar que um teste trivial passa

## 2. Domínio do ledger (função pura)

- [x] 2.1 Definir os tipos de lançamento (`despesa`, `acerto`, `proporcao`) com valores em centavos e proporção inteira, e verificar que o compilador rejeita campos faltando
- [x] 2.2 Implementar a divisão de uma despesa com arredondamento (parte do outro arredondada, a de quem pagou é o resto) e verificar com testes que a soma das partes é sempre o total (inclui R$ 0,01 em 50/50)
- [x] 2.3 Implementar a varredura do histórico ordenado (ciclo corrente, proporção vigente, saldo) e verificar os cenários de saldo da spec `ledger` (saldo após despesa, acerto parcial, acerto que zera, saldo invertido)
- [x] 2.4 Implementar o fechamento de ciclo (acerto que zera o saldo fecha; parcial ou invertido não) e verificar que um ciclo fechado nunca é reaberto por lançamentos posteriores
- [x] 2.5 Implementar a proporção vigente por ciclo e a reaplicação ao ciclo aberto, com despesas customizadas e ciclos fechados preservados, e verificar com os cenários de mudança de proporção da spec
- [x] 2.6 Calcular o saldo acumulado por lançamento e o saldo antes/depois nos itens `proporcao`, e verificar com testes de histórico misto
- [x] 2.7 Implementar as validações de escrita (data mínima = fechamento do último ciclo, data máxima = hoje, remoção só no ciclo aberto, acerto de fechamento não removível) e verificar com os cenários de data e de remoção
- [x] 2.8 Implementar a simulação de uma nova proporção (saldo antes e depois sem gravar) e verificar que não altera o histórico de entrada

## 3. Persistência no DynamoDB

- [x] 3.1 Implementar o repositório do item `CONFIG/main` (leitura, criação condicional de `jwtSecret`) e verificar com teste contra DynamoDB local que duas criações simultâneas resultam num único segredo
- [x] 3.2 Implementar o repositório de lançamentos (gravar com `sk = data#id`, listar ordenado, remover condicional) e verificar com teste que a listagem vem por data e, em empate, por ordem de criação
- [x] 3.3 Implementar a inicialização (senha `batman` com salt e hash, primeiro lançamento `proporcao` 50/50) e verificar que rodar duas vezes não duplica nem sobrescreve

## 4. Autenticação

- [x] 4.1 Implementar a verificação de senha com `sha256(senha + salt)` e `timingSafeEqual`, e verificar com testes de senha correta, incorreta e usuário desconhecido
- [x] 4.2 Implementar a emissão e a validação do JWT HS256 de 3650 dias, e verificar com testes de token válido, expirado, adulterado e com segredo rotacionado
- [x] 4.3 Implementar o middleware que exige JWT em todas as rotas, exceto o login, e verificar que as rotas respondem 401 sem token

## 5. API HTTP (Lambda Function URL)

- [x] 5.1 Implementar `POST /api/login` e verificar com teste de integração local que devolve token e identidade
- [x] 5.2 Implementar `GET /api/saldo` (saldo atual, balanço do ciclo aberto, proporção vigente) e verificar contra um histórico semeado
- [x] 5.3 Implementar `GET /api/historico` com os campos de cada card e verificar a ordem e o saldo acumulado
- [x] 5.4 Implementar `POST /api/lancamentos` para despesa, acerto e proporção, com as validações do domínio, e verificar os erros de valor inválido, data futura e data anterior ao fechamento
- [x] 5.5 Implementar `DELETE /api/lancamentos/:id` e verificar que remove no ciclo aberto e recusa em ciclo fechado e no acerto de fechamento
- [x] 5.6 Implementar `POST /api/proporcao/preview` e verificar que devolve saldo antes e depois sem gravar

## 6. Infraestrutura

- [x] 6.1 Definir a tabela DynamoDB, a Lambda com role mínima (somente a tabela), e o bucket S3, e verificar que o `synth`/`validate` da IaC passa
- [x] 6.2 Definir a distribuição CloudFront com `/*` para o S3 e `/api/*` para a Function URL sem cache, e verificar com `curl` que a mesma origem serve o app e a API
- [x] 6.3 Manter a Function URL pública (sem OAC, ver D1) e verificar com `curl`, direto na URL da Lambda e pelo CloudFront, que as rotas protegidas respondem 401 sem token e que o login funciona pelos dois caminhos
- [x] 6.4 Criar o script de deploy com a inicialização (senha e proporção inicial) e verificar que um deploy limpo deixa o app funcionando

## 7. Frontend PWA

- [x] 7.1 Criar o shell do app com `manifest`, ícone e service worker que cacheia só os arquivos estáticos, e verificar no navegador que o app é instalável e que `/api/*` nunca é servido do cache
- [x] 7.2 Implementar a tela de Login (escolha entre `ariel` e `isabella`, senha) com o token em `localStorage`, e verificar que reabrir o app com token válido pula o login e um 401 volta ao login
- [x] 7.3 Implementar a tela de Saldo (proporção, total do ciclo, quanto cada um pagou, parte de cada um, frase do saldo, botão grande de adicionar compra), e verificar com dados semeados, incluindo o estado de saldo zerado
- [x] 7.4 Implementar a tela de Compra (valor com teclado numérico, quem pagou, descrição, data, proporção padrão ou customizada), registrando sem confirmação, e verificar que volta ao Saldo atualizado
- [x] 7.5 Implementar a tela de Histórico em cards (conta, quem pagou, total, proporção, partes e saldo acumulado), com cards de acerto e proporção distintos e sem a ação remover em ciclos fechados, e verificar no viewport de celular sem rolagem horizontal
- [x] 7.6 Implementar o fluxo de remoção com modal de confirmação e verificar que cancelar não remove
- [x] 7.7 Implementar o fluxo "Paguei" (valor preenchido com o saldo, editável, confirmação que avisa quando fecha o ciclo) e verificar que cancelar não grava
- [x] 7.8 Implementar a tela de Proporção com preview de saldo antes e depois e ação de salvar, e verificar que o lançamento aparece no histórico

## 8. Verificação integrada

- [x] 8.1 Executar o roteiro completo em um celular (instalar, logar, registrar despesa padrão e customizada, mudar proporção, acerto parcial e total, remoção) e verificar que todos os cenários das specs `auth`, `ledger` e `pwa-ui` se comportam como descrito
- [x] 8.2 Rodar `openspec validate bill-split-pwa --strict` e verificar que passa sem erros
