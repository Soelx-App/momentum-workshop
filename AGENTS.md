<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instruções do workshop

Leia o README antes de executar o projeto. Use Node.js 22 e pnpm 10.

- Instale dependências com `pnpm install`. Não gere lockfiles de npm ou Yarn.
- Na raiz, `pnpm dev` inicia Convex e Next.js juntos. `npm run dev` executa o mesmo script. Não inicie os serviços separadamente.
- Reutilize um servidor existente quando possível. Se iniciar o servidor para testes do usuário, mantenha-o ativo e informe a URL. Não o encerre ao terminar a validação sem avisar o usuário.
- Confirme a leitura e a escrita pelo contador no navegador, inclusive após recarregar. Se a mutation ficar pendente, confira a conexão com o backend e os logs do processo de desenvolvimento.
- Execute `pnpm check` antes de entregar. Não rode `convex deploy` como teste. O destino pode ser produção.
- Os PRs dos times têm como base `alpha` ou `beta`. Cada branch tem seu próprio projeto Vercel e backend Convex de produção. `main` mantém a base do workshop; não trate `main` como produção dos times.
- Não versione `.env.local`, credenciais ou artefatos de build. Não publique commits sem autorização.
