# Momentum workshop

Base mínima com Next.js, TypeScript, pnpm e Convex. Use Node.js 22 e pnpm 10 (`npm install -g pnpm@10.34.6`).

## Começar

```bash
git clone https://github.com/Soelx-App/momentum-workshop.git
cd momentum-workshop
pnpm install
pnpm dev
```

**`pnpm dev` sobe tudo: Convex e Next.js, no mesmo terminal.** `npm run dev` executa o mesmo script, caso prefira esse comando. Instale dependências com pnpm; não execute `npm install`.

Mantenha esse terminal aberto enquanto usar o app. Abra http://localhost:3000, ou a URL exibida pelo Next.js. O contador comprova leitura e escrita no Convex.

## Convex

Na primeira execução, o CLI configura o backend e cria `.env.local`. Escolha desenvolvimento local sem conta, ou faça login e selecione um projeto de desenvolvimento da sua equipe. Não use produção nem copie deploy keys para sua máquina. Nas próximas execuções, basta `pnpm dev`, que inicia Next.js e Convex juntos.

Cada pessoa usa seu próprio backend de desenvolvimento. O plano Free permite até seis desenvolvedores por organização; para dois times de quatro com acesso ao dashboard, use uma organização gratuita por time. Isso não muda os previews do repositório.

## Para agentes

- Leia `AGENTS.md`. Use Node.js 22, instale com `pnpm install` e inicie tudo com `pnpm dev` na raiz do repositório. Não suba Next.js e Convex separadamente.
- Antes de iniciar outro processo, verifique se o app já está rodando. Para testes de navegador, mantenha o processo ativo e informe a URL ao usuário. Não encerre o servidor após validar se o usuário ainda for testar.
- Teste o botão Incrementar e recarregue a página para confirmar a gravação. Se ficar em "Gravando...", confira os logs e a conexão com o backend: o Convex pode aguardar reconexão sem rejeitar a mutation. No modo local, encerrar `pnpm dev` também encerra o backend.
- Execute `pnpm check` antes de entregar. Não use `convex deploy` para validar desenvolvimento; esse comando pode publicar em produção. Nunca versione `.env.local` nem deploy keys.

## Branches

`main` é produção. Crie branches de feature normalmente, por exemplo `time-1/contador` e `time-2/contador`. Após a configuração da Vercel, cada branch enviada ao GitHub gera um Preview da Vercel conectado ao Convex Preview da mesma branch, com banco separado. Novos commits da mesma branch reutilizam esse banco; no plano Free, o Convex expira previews após cinco dias. PRs de forks podem exigir aprovação do responsável na Vercel.

## Antes de abrir PR

```bash
pnpm check
```

Executa TypeScript, lint e build, sem fazer deploy. `pnpm build` executa apenas o build do Next.js.

## Deploy

Local usa o backend de desenvolvimento de cada pessoa. Preview usa um backend Convex isolado por branch; o CLI injeta sua URL no build do frontend. Merge em `main` usa o deployment de produção separado, sem copiar dados dos previews.

Configuração única do responsável:

- Convex: no projeto `momentum-workshop` da organização `davi-lemes`, crie ou selecione **Production** e gere uma Production Deploy Key com `deployment:deploy`. Em Project Settings, gere uma **Preview Deploy Key**.
- Vercel: importe este repositório público em `lemesdev` (Hobby), com raiz `.`, framework Next.js, Node.js 22 e Production Branch `main`. Mantenha os deploys Git automáticos e a exposição de variáveis de sistema habilitados. `vercel.json` já define instalação e build.
- Vercel: cadastre `CONVEX_DEPLOY_KEY` duas vezes, Production Key **somente em Production** e Preview Key **somente em Preview**, para todas as branches. Não cadastre em Development e não fixe `NEXT_PUBLIC_CONVEX_URL` ou `CONVEX_DEPLOYMENT` no dashboard.

O build oficial é `pnpm exec convex deploy --cmd 'pnpm build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`. Não requer workflow de deploy no GitHub, integração Marketplace ou ambientes extras.

O [Vercel Hobby](https://vercel.com/docs/plans/hobby) permite apenas uso pessoal não comercial. Um repositório público não remove essa restrição; confirme que o workshop se enquadra antes de usar o plano gratuito.

Antes do workshop, confirme que um commit de aluno em uma branch deste repositório dispara o Preview automaticamente. A [documentação de Git](https://vercel.com/docs/git#deploying-private-git-repositories) separa repositórios públicos da restrição de autor no Hobby, mas um [artigo da Vercel](https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel#hobby-plans-enforce-collaboration-limits) afirma a restrição sem essa exceção. Mantenha Git Fork Protection habilitado.

Referências: [Convex + Vercel](https://docs.convex.dev/production/hosting/vercel) e [Convex Preview Deployments](https://docs.convex.dev/production/hosting/preview-deployments).
