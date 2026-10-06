# Momentum workshop

Base mínima com Next.js, TypeScript, pnpm e Convex. Use Node.js 22 e pnpm 10 (`npm install -g pnpm@10.34.6`).

Sites dos times: [Alpha](https://momentum-workshop-alpha.vercel.app) e [Beta](https://momentum-workshop-beta.vercel.app). Cada site tem seu próprio banco de produção.

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

Cada pessoa usa seu próprio backend de desenvolvimento. O plano Free permite até seis desenvolvedores por organização; para dois times de quatro com acesso ao dashboard, use uma organização gratuita por time. Os deployments centrais de Alpha e Beta continuam no projeto `momentum-workshop` da organização `davi-lemes`.

## Para agentes

- Leia `AGENTS.md`. Use Node.js 22, instale com `pnpm install` e inicie tudo com `pnpm dev` na raiz do repositório. Não suba Next.js e Convex separadamente.
- Antes de iniciar outro processo, verifique se o app já está rodando. Para testes de navegador, mantenha o processo ativo e informe a URL ao usuário. Não encerre o servidor após validar se o usuário ainda for testar.
- Teste o botão Incrementar e recarregue a página para confirmar a gravação. Se ficar em "Gravando...", confira os logs e a conexão com o backend. O Convex pode aguardar reconexão sem rejeitar a mutation. No modo local, encerrar `pnpm dev` também encerra o backend.
- Execute `pnpm check` antes de entregar. Não use `convex deploy` para validar desenvolvimento; esse comando pode publicar em produção. Nunca versione `.env.local` nem deploy keys.

## Branches

`main` mantém a base do workshop. Cada time desenvolve a partir de sua branch e abre PRs para ela:

| Time | Branch de produção | Projeto Vercel | Convex Production |
|---|---|---|---|
| Alpha | `alpha` | `momentum-workshop-alpha` | `alpha` (`cheerful-weasel-405`) |
| Beta | `beta` | `momentum-workshop-beta` | `beta` (`laudable-lynx-684`) |

Depois de conectar o Git e configurar Branch Tracking na Vercel, merge em `alpha` publica Alpha; merge em `beta` publica Beta. Aprovar o PR sem merge não dispara deploy. As outras branches geram Vercel Previews com Convex Previews isolados por branch, sem alterar os bancos de produção. Use no commit um email associado à sua conta GitHub, inclusive o endereço `noreply` fornecido pelo GitHub. Novos commits da mesma branch reutilizam seu banco Preview; no Convex Free, previews expiram após cinco dias. PRs de forks podem exigir aprovação na Vercel.

## Antes de abrir PR

```bash
pnpm check
```

Executa TypeScript, lint e build, sem fazer deploy. `pnpm build` executa apenas o build do Next.js.

## Deploy

Local usa o backend de desenvolvimento de cada pessoa. Preview usa o Convex Preview da branch, e o CLI injeta sua URL no build do frontend. Produção usa o backend permanente do time, sem copiar dados de previews nem do outro time.

Os dois projetos Vercel e backends de produção já foram provisionados. Cada projeto Vercel tem `CONVEX_DEPLOY_KEY` da produção correspondente **somente em Production**, com permissão `deployment:deploy`, e a Preview Deploy Key oficial **somente em Preview**. Next.js, Node.js 22, instalação, build e variáveis de sistema já estão configurados; não fixe `NEXT_PUBLIC_CONVEX_URL` ou `CONVEX_DEPLOYMENT` no dashboard.

O código e as branches `main`, `alpha` e `beta` já estão publicados. Os dois projetos Vercel estão conectados ao GitHub, e os sites já receberam o primeiro deploy de produção. Os [PRs de teste Alpha](https://github.com/Soelx-App/momentum-workshop/pull/1) e [Beta](https://github.com/Soelx-App/momentum-workshop/pull/2) comprovaram os Previews automáticos e a separação dos bancos; não faça merge desses PRs de validação.

O Branch Tracking já está configurado. O [projeto Alpha](https://vercel.com/lemesdev/momentum-workshop-alpha/settings/environments) acompanha `alpha`, e o [projeto Beta](https://vercel.com/lemesdev/momentum-workshop-beta/settings/environments) acompanha `beta`. Mudanças em `main` não atualizam as produções dos times.

A configuração inicial usou pelo CLI o [endpoint do dashboard permitido pela Vercel](https://community.vercel.com/t/rest-api-docs-for-updating-production-git-branch/820), que não é garantido como API pública. Os deploys normais usam a integração Git da Vercel e o CLI oficial do Convex, sem depender desse endpoint.

O build oficial é `pnpm exec convex deploy --cmd 'pnpm build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`. Não requer workflow de deploy no GitHub, integração Marketplace ou ambientes extras.

O [Vercel Hobby](https://vercel.com/docs/plans/hobby) permite apenas uso pessoal não comercial. Um repositório público não remove essa restrição; confirme que o workshop se enquadra antes de usar o plano gratuito.

Antes do workshop, confirme que um commit de aluno em uma branch deste repositório dispara o Preview automaticamente. A [documentação de Git](https://vercel.com/docs/git#deploying-private-git-repositories) separa repositórios públicos da restrição de autor no Hobby, mas um [artigo da Vercel](https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel#hobby-plans-enforce-collaboration-limits) afirma a restrição sem essa exceção. Mantenha Git Fork Protection habilitado.

Referências: [Convex + Vercel](https://docs.convex.dev/production/hosting/vercel) e [Convex Preview Deployments](https://docs.convex.dev/production/hosting/preview-deployments).
