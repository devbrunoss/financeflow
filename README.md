# FinanceFlow

Aplicação web de controle financeiro pessoal (receitas, despesas, orçamentos e metas), feita como projeto de portfólio. **Não** se conecta a bancos, não faz pagamentos nem movimenta dinheiro: tudo é registro manual do usuário.

## Funcionalidades

- **Autenticação:** cadastro, login, logout, sessão persistente em cookie, rotas privadas, dados isolados por usuário.
- **Transações:** criar, editar, excluir; filtros (período, tipo, categoria, busca), ordenação e paginação.
- **Dashboard:** saldo, receitas, despesas e resultado do mês, evolução de 6 meses, despesas por categoria, transações recentes e comparação com o mês anterior.
- **Categorias:** criar, renomear, arquivar e excluir (com regras para categorias em uso).
- **Orçamentos:** limite mensal por categoria de despesa, percentual consumido e alertas.
- **Metas:** metas com aportes e retiradas.
- **Exportação:** CSV das transações, respeitando os filtros.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 7 · Better Auth · Zod · React Hook Form · Recharts · decimal.js · Vitest.

## Como executar

Pré-requisitos: Node.js 22+ e um PostgreSQL 16 (Docker ou instalação local).

```bash
git clone <seu-repositorio> && cd financeflow
npm install
cp .env.example .env        # edite BETTER_AUTH_SECRET (openssl rand -base64 32)
```

### PostgreSQL

**Com Docker/Podman:** `docker compose up -d` (usuário, senha e banco `financeflow`, porta 5432).

**Instalação local:**
```bash
sudo -u postgres psql -c "CREATE ROLE financeflow LOGIN PASSWORD 'financeflow' CREATEDB;" \
                      -c "CREATE DATABASE financeflow OWNER financeflow;"
```
(`CREATEDB` é necessário porque `prisma migrate dev` usa um banco temporário. Use senha forte fora de desenvolvimento.)

### Migrations e servidor

```bash
npx prisma migrate dev      # aplica as migrations
npx prisma generate         # gera o client em src/generated (ignorado pelo Git)
npm run dev                 # http://localhost:3000
```

### Testes

```bash
npm run typecheck
npm test                    # unitários + integração (exige o PostgreSQL do .env)
```

Os testes de integração criam e removem os próprios usuários (`*test-*@x.com`) no banco configurado em `DATABASE_URL`: **não aponte para um banco com dados reais**.

## Arquitetura

```
src/
  app/            páginas e layouts (App Router); (auth) público, (app) privado; api/export (CSV)
  components/     componentes compartilhados
  lib/
    auth/         Better Auth, requireUser()
    db/           acesso ao banco: toda função recebe userId
    finance/      regras financeiras: funções puras e testáveis (decimal.js)
    validation/   schemas Zod, compartilhados por cliente e servidor
  server/actions/ Server Actions: autenticam, validam, chamam o banco, revalidam
prisma/           schema e migrations
tests/            unit/ e integration/
```

Fluxo de uma mutação: Server Action → `requireUser()` → Zod → regra em `lib/finance` → função em `lib/db` (sempre com `userId`) → `revalidatePath`. Server Components por padrão; Client Components só onde há interatividade. Nenhum componente calcula totais por conta própria.

## Modelo de dados

`User`, `Category`, `Transaction`, `Budget`, `Goal`, `GoalContribution` e as tabelas do Better Auth (`Session`, `Account`, `Verification`). Valores monetários são `DECIMAL(14,2)`; datas de transações, `DATE`; `createdAt`/`updatedAt` são `timestamptz`.

**Isolamento no banco:** as chaves estrangeiras são compostas com `userId` (ex.: `Transaction(categoryId, userId, type) → Category(id, userId, type)`), então mesmo um bug na aplicação não consegue ligar um registro à categoria ou meta de outro usuário, nem uma despesa a uma categoria de receita. Restrições `CHECK` garantem valores positivos e orçamentos no dia 1 do mês.

## Regras financeiras

- **Dinheiro:** nunca se usa `float` em cálculos; tudo é `Decimal` (decimal.js no código, `DECIMAL(14,2)` no banco). `Number()` aparece só para desenhar o gráfico. Máximo: 999.999.999.999,99. Entrada aceita `1234,56`, `1.234,56` e `1234.56`; rejeita zero, negativos, mais de 2 casas e formatos ambíguos como `1.234`.
- **Valor e tipo:** o valor é sempre positivo; o tipo (receita/despesa) dá o sinal.
- **Saldo:** soma de todas as receitas menos todas as despesas do usuário, de todos os tempos. Não há saldo inicial (limitação conhecida).
- **Resultado do período:** receitas do período menos despesas do período. Períodos são intervalos fechados `[início, fim]`.
- **Datas e fusos:** a data da transação é uma data de calendário, sem horário, então uma compra do dia 31 às 23h continua no dia 31. "Hoje" e o "mês atual" são calculados no fuso `America/Sao_Paulo`. `createdAt`/`updatedAt` ficam em UTC.
- **Mês de uma transação:** o mês da própria data (30/09 é setembro; 01/10 é outubro).
- **Comparação com o mês anterior:** variação percentual com 1 casa. Sem transações no mês anterior ou com base zero, mostra "sem dados" em vez de inventar um número.
- **Orçamentos:** um limite por categoria de despesa por mês. O gasto é a soma das despesas da categoria com data dentro do mês. Estados: **dentro do limite** (< 80%), **perto do limite** (≥ 80%, inclusive exatamente 100%) e **ultrapassado** (> 100%). A comparação usa precisão total; só a exibição é arredondada.
- **Metas:** o valor acumulado é **derivado** da soma das contribuições (aporte positivo, retirada negativa), nunca um campo editável. Metas **não alteram o saldo nem criam transações**: são planejamento. Atingir o alvo marca a meta como concluída; uma retirada que a deixe abaixo do alvo a reabre; retirada acima do acumulado é rejeitada; meta cancelada não aceita aportes. Cada aporte é gravado numa transação de banco (`SERIALIZABLE`) junto com a atualização de status.
- **Categorias:** únicas por usuário, nome e tipo. Renomear é sempre permitido; o tipo não muda. Categorias usadas em transações **não podem ser excluídas** (arquive-as: elas somem dos formulários mas mantêm o histórico). Excluir uma categoria sem transações remove também seus orçamentos.
- **CSV:** separador `;`, UTF-8 com BOM (abre com acentos no Excel pt-BR), valores com vírgula decimal, quebras `CRLF`. Campos de texto que começam com `=`, `+`, `-`, `@`, TAB ou CR recebem um `'` na frente para não virarem fórmulas; aspas, `;` e quebras de linha são escapados. Respeita os filtros e o usuário logado; limite de 50.000 linhas.

## Segurança

Autorização no servidor em toda página, ação e rota (`requireUser()`; o `proxy.ts` é só uma checagem otimista extra). Toda consulta e mutação filtra por `userId`; ids de outros usuários resultam em "não encontrado". Entradas validadas com Zod no servidor. Senhas com hash (scrypt, via Better Auth). Cookies `httpOnly`, e `secure` em produção. Mensagem de login genérica (não revela se o e-mail existe). Limite de 5 tentativas/minuto em login e cadastro. Erros inesperados são registrados só no servidor. `.env` fora do Git; use um `BETTER_AUTH_SECRET` diferente em cada ambiente.

## Limitações conhecidas

- Sem saldo inicial, contas múltiplas, transferências, recorrências ou várias moedas.
- Sem verificação de e-mail nem recuperação de senha.
- O limite de tentativas de login fica em memória: não é compartilhado entre instâncias (inadequado para serverless com várias réplicas).
- A evolução mensal e o orçamento somam no servidor as transações da janela; serve para uso pessoal, não para volumes muito grandes.
- A exportação é limitada a 50.000 linhas e é gerada em memória.
- Não há testes de interface/ponta a ponta automatizados; a verificação das telas foi manual.
- O `npm audit` reporta avisos moderados em dependências transitivas ainda não revisados.
- Acessibilidade: cores nunca são o único indicador (há texto, ícones e sinais), mas não houve auditoria com leitores de tela.

## Deploy (não testado neste projeto)

Sugestão: PostgreSQL gerenciado (Neon/Supabase) e Vercel. Defina `DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`; rode `npx prisma migrate deploy` contra o banco de produção; garanta `prisma generate` no build (`npm pkg set scripts.postinstall="prisma generate"`). Consulte a documentação oficial de cada serviço.
